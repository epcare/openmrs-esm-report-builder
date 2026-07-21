/**
 * Unit tests for the population SQL compiler.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
    compilePopulationSql,
    generateScalarCountSql,
    generateAgeSexDisaggregationSql,
    clearCompilationCache,
    CircularDependencyError,
    MissingReferenceError
} from './population-sql.compiler';
import type { IndicatorDto } from '../../../resources/indicator/indicators.api';

// Mock indicator factory
function createIndicator(overrides: Partial<IndicatorDto> = {}): IndicatorDto {
    return {
        uuid: 'test-uuid',
        name: 'Test Indicator',
        code: 'TEST',
        kind: 'BASE',
        configJson: null,
        sqlTemplate: null,
        ...overrides
    };
}

// Mock getIndicator function
function createMockGetIndicator(indicators: Map<string, IndicatorDto>) {
    return async (uuid: string): Promise<IndicatorDto | null> => {
        return indicators.get(uuid) || null;
    };
}

describe('Population SQL Compiler', () => {
    beforeEach(() => {
        clearCompilationCache();
    });

    describe('Base Indicator Population', () => {
        it('should extract population SQL from a base indicator', async () => {
            const indicator = createIndicator({
                kind: 'BASE',
                sqlTemplate: 'SELECT DISTINCT a.patient_id FROM table_a a WHERE a.date >= :startDate'
            });

            const getIndicator = createMockGetIndicator(new Map());
            const result = await compilePopulationSql(indicator, getIndicator);

            expect(result.sql).toContain('SELECT DISTINCT');
            expect(result.sql).toContain('patient_id');
            expect(result.sql).toContain(':startDate');
        });

        it('should convert COUNT SQL to population SQL', async () => {
            const indicator = createIndicator({
                kind: 'BASE',
                sqlTemplate: 'SELECT COUNT(*) AS total FROM table_a a WHERE a.date >= :startDate'
            });

            const getIndicator = createMockGetIndicator(new Map());
            const result = await compilePopulationSql(indicator, getIndicator);

            expect(result.sql).toContain('SELECT DISTINCT');
            expect(result.sql).not.toContain('COUNT(*)');
        });

        it('should fix :stratDate typo to :startDate', async () => {
            const indicator = createIndicator({
                kind: 'BASE',
                sqlTemplate: 'SELECT DISTINCT a.patient_id FROM table_a a WHERE a.date >= :stratDate'
            });

            const getIndicator = createMockGetIndicator(new Map());
            const result = await compilePopulationSql(indicator, getIndicator);

            expect(result.sql).toContain(':startDate');
            expect(result.sql).not.toContain(':stratDate');
        });

        it('should handle population SQL with config_json source', async () => {
            const config = {
                version: 1,
                sqlPreview: 'SELECT DISTINCT patient_id FROM patients WHERE active = 1'
            };

            const indicator = createIndicator({
                kind: 'BASE',
                configJson: JSON.stringify(config),
                sqlTemplate: null
            });

            const getIndicator = createMockGetIndicator(new Map());
            const result = await compilePopulationSql(indicator, getIndicator);

            expect(result.sql).toContain('SELECT DISTINCT patient_id');
        });
    });

    describe('Composite Indicator - AND Operator', () => {
        it('should compile AND composite indicator with INNER JOIN', async () => {
            // Create two base indicators
            const indicatorA = createIndicator({
                uuid: 'indicator-a',
                code: 'A',
                kind: 'BASE',
                sqlTemplate: 'SELECT DISTINCT patient_id FROM table_a WHERE condition_a = 1'
            });

            const indicatorB = createIndicator({
                uuid: 'indicator-b',
                code: 'B',
                kind: 'BASE',
                sqlTemplate: 'SELECT DISTINCT patient_id FROM table_b WHERE condition_b = 1'
            });

            // Create composite indicator
            const composite = createIndicator({
                uuid: 'composite-and',
                code: 'A_AND_B',
                kind: 'COMPOSITE',
                configJson: JSON.stringify({
                    version: 1,
                    unit: 'Patients',
                    operator: 'AND',
                    indicatorAId: 'indicator-a',
                    indicatorBId: 'indicator-b'
                })
            });

            const indicators = new Map([
                ['indicator-a', indicatorA],
                ['indicator-b', indicatorB]
            ]);
            const getIndicator = createMockGetIndicator(indicators);

            const result = await compilePopulationSql(composite, getIndicator);

            expect(result.sql).toContain('WITH A AS');
            expect(result.sql).toMatch(/B AS \(/);  // B AS ( appears after A, without WITH
            expect(result.sql).toContain('INNER JOIN B');
            expect(result.sql).toContain('ON B.patient_id = A.patient_id');
            expect(result.sql).toMatch(/SELECT DISTINCT\s+A\.patient_id/);  // Handles multi-line SELECT
        });

        it('should compile nested composite indicators correctly', async () => {
            // HC01 = enrollment A_AND_NOT_B transfer-in
            const enrollment = createIndicator({
                uuid: 'enrollment',
                code: 'ENROLLMENT',
                kind: 'BASE',
                sqlTemplate: 'SELECT DISTINCT patient_id FROM enrollment WHERE date >= :startDate'
            });

            const transferIn = createIndicator({
                uuid: 'transfer-in',
                code: 'TRANSFER_IN',
                kind: 'BASE',
                sqlTemplate: 'SELECT DISTINCT patient_id FROM transfer_in WHERE date >= :startDate'
            });

            const hc01 = createIndicator({
                uuid: 'hc01',
                code: 'HC01',
                kind: 'COMPOSITE',
                configJson: JSON.stringify({
                    version: 1,
                    unit: 'Patients',
                    operator: 'A_AND_NOT_B',
                    indicatorAId: 'enrollment',
                    indicatorBId: 'transfer-in'
                })
            });

            const tbAssessed = createIndicator({
                uuid: 'tb-assessed',
                code: 'TB_ASSESSED',
                kind: 'BASE',
                sqlTemplate: 'SELECT DISTINCT patient_id FROM tb_assessment WHERE assessed = 1'
            });

            // HC02A = HC01 AND TB assessed
            const hc02a = createIndicator({
                uuid: 'hc02a',
                code: 'HC02A',
                kind: 'COMPOSITE',
                configJson: JSON.stringify({
                    version: 1,
                    unit: 'Patients',
                    operator: 'AND',
                    indicatorAId: 'hc01',
                    indicatorBId: 'tb-assessed'
                })
            });

            const indicators = new Map([
                ['enrollment', enrollment],
                ['transfer-in', transferIn],
                ['hc01', hc01],
                ['tb-assessed', tbAssessed]
            ]);
            const getIndicator = createMockGetIndicator(indicators);

            const result = await compilePopulationSql(hc02a, getIndicator);

            // Should contain nested CTE structure
            expect(result.sql).toContain('WITH A AS');

            // Should have INNER JOIN for AND
            expect(result.sql).toContain('INNER JOIN B');

            // Should have LEFT JOIN for A_AND_NOT_B
            expect(result.sql).toContain('LEFT JOIN B');
            expect(result.sql).toContain('WHERE B.patient_id IS NULL');

            // Should not contain COUNT(*)
            expect(result.sql).not.toContain('COUNT(*)');

            // All patient_id references should be preserved
            expect(result.sql).toMatch(/patient_id/g);
        });
    });

    describe('Composite Indicator - A_AND_NOT_B Operator', () => {
        it('should compile A_AND_NOT_B with LEFT JOIN and IS NULL', async () => {
            const indicatorA = createIndicator({
                uuid: 'indicator-a',
                code: 'A',
                kind: 'BASE',
                sqlTemplate: 'SELECT DISTINCT patient_id FROM table_a'
            });

            const indicatorB = createIndicator({
                uuid: 'indicator-b',
                code: 'B',
                kind: 'BASE',
                sqlTemplate: 'SELECT DISTINCT patient_id FROM table_b'
            });

            const composite = createIndicator({
                uuid: 'composite-not',
                code: 'A_NOT_B',
                kind: 'COMPOSITE',
                configJson: JSON.stringify({
                    version: 1,
                    unit: 'Patients',
                    operator: 'A_AND_NOT_B',
                    indicatorAId: 'indicator-a',
                    indicatorBId: 'indicator-b'
                })
            });

            const indicators = new Map([
                ['indicator-a', indicatorA],
                ['indicator-b', indicatorB]
            ]);
            const getIndicator = createMockGetIndicator(indicators);

            const result = await compilePopulationSql(composite, getIndicator);

            expect(result.sql).toContain('LEFT JOIN B');
            expect(result.sql).toContain('WHERE B.patient_id IS NULL');
        });
    });

    describe('Composite Indicator - OR Operator', () => {
        it('should compile OR with UNION', async () => {
            const indicatorA = createIndicator({
                uuid: 'indicator-a',
                code: 'A',
                kind: 'BASE',
                sqlTemplate: 'SELECT DISTINCT patient_id FROM table_a'
            });

            const indicatorB = createIndicator({
                uuid: 'indicator-b',
                code: 'B',
                kind: 'BASE',
                sqlTemplate: 'SELECT DISTINCT patient_id FROM table_b'
            });

            const composite = createIndicator({
                uuid: 'composite-or',
                code: 'A_OR_B',
                kind: 'COMPOSITE',
                configJson: JSON.stringify({
                    version: 1,
                    unit: 'Patients',
                    operator: 'OR',
                    indicatorAId: 'indicator-a',
                    indicatorBId: 'indicator-b'
                })
            });

            const indicators = new Map([
                ['indicator-a', indicatorA],
                ['indicator-b', indicatorB]
            ]);
            const getIndicator = createMockGetIndicator(indicators);

            const result = await compilePopulationSql(composite, getIndicator);

            expect(result.sql).toContain('UNION');
            expect(result.sql).toContain('SELECT patient_id FROM A');
            expect(result.sql).toContain('SELECT patient_id FROM B');
        });
    });

    describe('Circular Dependency Detection', () => {
        it('should detect direct circular dependency (A -> B -> A)', async () => {
            const indicatorA = createIndicator({
                uuid: 'indicator-a',
                code: 'A',
                kind: 'COMPOSITE',
                configJson: JSON.stringify({
                    version: 1,
                    unit: 'Patients',
                    operator: 'AND',
                    indicatorAId: 'indicator-b',
                    indicatorBId: 'some-base'
                })
            });

            const indicatorB = createIndicator({
                uuid: 'indicator-b',
                code: 'B',
                kind: 'COMPOSITE',
                configJson: JSON.stringify({
                    version: 1,
                    unit: 'Patients',
                    operator: 'AND',
                    indicatorAId: 'indicator-a',
                    indicatorBId: 'some-other-base'
                })
            });

            const someBase = createIndicator({
                uuid: 'some-base',
                code: 'BASE',
                kind: 'BASE',
                sqlTemplate: 'SELECT DISTINCT patient_id FROM base'
            });

            const someOtherBase = createIndicator({
                uuid: 'some-other-base',
                code: 'OTHER',
                kind: 'BASE',
                sqlTemplate: 'SELECT DISTINCT patient_id FROM other'
            });

            const indicators = new Map([
                ['indicator-a', indicatorA],
                ['indicator-b', indicatorB],
                ['some-base', someBase],
                ['some-other-base', someOtherBase]
            ]);
            const getIndicator = createMockGetIndicator(indicators);

            await expect(
                compilePopulationSql(indicatorA, getIndicator)
            ).rejects.toThrow(CircularDependencyError);
        });

        it('should detect deep circular dependency (A -> B -> C -> A)', async () => {
            const baseA = createIndicator({
                uuid: 'base-a',
                code: 'BASE_A',
                kind: 'BASE',
                sqlTemplate: 'SELECT DISTINCT patient_id FROM base_a'
            });

            const indicatorC = createIndicator({
                uuid: 'indicator-c',
                code: 'C',
                kind: 'COMPOSITE',
                configJson: JSON.stringify({
                    version: 1,
                    unit: 'Patients',
                    operator: 'AND',
                    indicatorAId: 'indicator-a',
                    indicatorBId: 'base-a'
                })
            });

            const indicatorB = createIndicator({
                uuid: 'indicator-b',
                code: 'B',
                kind: 'COMPOSITE',
                configJson: JSON.stringify({
                    version: 1,
                    unit: 'Patients',
                    operator: 'AND',
                    indicatorAId: 'indicator-c',
                    indicatorBId: 'base-a'
                })
            });

            const indicatorA = createIndicator({
                uuid: 'indicator-a',
                code: 'A',
                kind: 'COMPOSITE',
                configJson: JSON.stringify({
                    version: 1,
                    unit: 'Patients',
                    operator: 'AND',
                    indicatorAId: 'indicator-b',
                    indicatorBId: 'base-a'
                })
            });

            const indicators = new Map([
                ['indicator-a', indicatorA],
                ['indicator-b', indicatorB],
                ['indicator-c', indicatorC],
                ['base-a', baseA]
            ]);
            const getIndicator = createMockGetIndicator(indicators);

            await expect(
                compilePopulationSql(indicatorA, getIndicator)
            ).rejects.toThrow(CircularDependencyError);
        });
    });

    describe('Missing Reference Validation', () => {
        it('should throw error for missing indicatorAId', async () => {
            const composite = createIndicator({
                uuid: 'composite',
                code: 'COMP',
                kind: 'COMPOSITE',
                configJson: JSON.stringify({
                    version: 1,
                    unit: 'Patients',
                    operator: 'AND',
                    indicatorBId: 'indicator-b'
                })
            });

            const getIndicator = createMockGetIndicator(new Map());

            await expect(
                compilePopulationSql(composite, getIndicator)
            ).rejects.toThrow(MissingReferenceError);
        });

        it('should throw error for missing indicatorBId', async () => {
            const indicatorA = createIndicator({
                uuid: 'indicator-a',
                code: 'A',
                kind: 'BASE',
                sqlTemplate: 'SELECT DISTINCT patient_id FROM table_a'
            });

            const composite = createIndicator({
                uuid: 'composite',
                code: 'COMP',
                kind: 'COMPOSITE',
                configJson: JSON.stringify({
                    version: 1,
                    unit: 'Patients',
                    operator: 'AND',
                    indicatorAId: 'indicator-a'
                })
            });

            const indicators = new Map([['indicator-a', indicatorA]]);
            const getIndicator = createMockGetIndicator(indicators);

            await expect(
                compilePopulationSql(composite, getIndicator)
            ).rejects.toThrow(MissingReferenceError);
        });

        it('should throw error for non-existent indicatorAId', async () => {
            const composite = createIndicator({
                uuid: 'composite',
                code: 'COMP',
                kind: 'COMPOSITE',
                configJson: JSON.stringify({
                    version: 1,
                    unit: 'Patients',
                    operator: 'AND',
                    indicatorAId: 'non-existent',
                    indicatorBId: 'indicator-b'
                })
            });

            const indicatorB = createIndicator({
                uuid: 'indicator-b',
                code: 'B',
                kind: 'BASE',
                sqlTemplate: 'SELECT DISTINCT patient_id FROM table_b'
            });

            const indicators = new Map([['indicator-b', indicatorB]]);
            const getIndicator = createMockGetIndicator(indicators);

            await expect(
                compilePopulationSql(composite, getIndicator)
            ).rejects.toThrow(MissingReferenceError);
        });
    });

    describe('Unsupported Operator', () => {
        it('should throw error for unsupported operator', async () => {
            const indicatorA = createIndicator({
                uuid: 'indicator-a',
                code: 'A',
                kind: 'BASE',
                sqlTemplate: 'SELECT DISTINCT patient_id FROM table_a'
            });

            const indicatorB = createIndicator({
                uuid: 'indicator-b',
                code: 'B',
                kind: 'BASE',
                sqlTemplate: 'SELECT DISTINCT patient_id FROM table_b'
            });

            const composite = createIndicator({
                uuid: 'composite',
                code: 'COMP',
                kind: 'COMPOSITE',
                configJson: JSON.stringify({
                    version: 1,
                    unit: 'Patients',
                    operator: 'XOR' as any, // Invalid operator
                    indicatorAId: 'indicator-a',
                    indicatorBId: 'indicator-b'
                })
            });

            const indicators = new Map([
                ['indicator-a', indicatorA],
                ['indicator-b', indicatorB]
            ]);
            const getIndicator = createMockGetIndicator(indicators);

            await expect(
                compilePopulationSql(composite, getIndicator)
            ).rejects.toThrow(Error);
        });
    });

    describe('Retired Indicator Handling', () => {
        it('should throw error when using retired indicator by default', async () => {
            const retiredIndicator = createIndicator({
                uuid: 'retired',
                code: 'RETIRED',
                kind: 'BASE',
                retired: true,
                sqlTemplate: 'SELECT DISTINCT patient_id FROM retired_table'
            });

            const composite = createIndicator({
                uuid: 'composite',
                code: 'COMP',
                kind: 'COMPOSITE',
                configJson: JSON.stringify({
                    version: 1,
                    unit: 'Patients',
                    operator: 'AND',
                    indicatorAId: 'retired',
                    indicatorBId: 'active'
                })
            });

            const activeIndicator = createIndicator({
                uuid: 'active',
                code: 'ACTIVE',
                kind: 'BASE',
                sqlTemplate: 'SELECT DISTINCT patient_id FROM active_table'
            });

            const indicators = new Map([
                ['retired', retiredIndicator],
                ['active', activeIndicator]
            ]);
            const getIndicator = createMockGetIndicator(indicators);

            await expect(
                compilePopulationSql(composite, getIndicator)
            ).rejects.toThrow('Cannot use retired indicator');
        });

        it('should allow retired indicator when allowRetired is true', async () => {
            const retiredIndicator = createIndicator({
                uuid: 'retired',
                code: 'RETIRED',
                kind: 'BASE',
                retired: true,
                sqlTemplate: 'SELECT DISTINCT patient_id FROM retired_table'
            });

            const activeIndicator = createIndicator({
                uuid: 'active',
                code: 'ACTIVE',
                kind: 'BASE',
                sqlTemplate: 'SELECT DISTINCT patient_id FROM active_table'
            });

            const composite = createIndicator({
                uuid: 'composite',
                code: 'COMP',
                kind: 'COMPOSITE',
                configJson: JSON.stringify({
                    version: 1,
                    unit: 'Patients',
                    operator: 'AND',
                    indicatorAId: 'retired',
                    indicatorBId: 'active'
                })
            });

            const indicators = new Map([
                ['retired', retiredIndicator],
                ['active', activeIndicator]
            ]);
            const getIndicator = createMockGetIndicator(indicators);

            const result = await compilePopulationSql(composite, getIndicator, new Set(), { allowRetired: true });

            expect(result.sql).toContain('WITH A AS');
            expect(result.warnings).toContain('Using retired indicator: RETIRED');
        });
    });

    describe('Scalar Count SQL Generation', () => {
        it('should wrap population SQL in COUNT query', () => {
            const populationSql = 'SELECT DISTINCT patient_id FROM patients WHERE active = 1';

            const scalarSql = generateScalarCountSql(populationSql);

            expect(scalarSql).toContain('WITH base_population AS');
            expect(scalarSql).toContain('COUNT(DISTINCT patient_id) AS total');
            expect(scalarSql).toContain('FROM base_population');
        });
    });

    describe('Age/Sex Disaggregation SQL Generation', () => {
        it('should generate disaggregation SQL with correct structure', () => {
            const populationSql = 'SELECT DISTINCT patient_id FROM patients WHERE active = 1';

            const disaggSql = generateAgeSexDisaggregationSql({
                populationSql,
                ageCategoryCode: 'HMIS_106A',
                genders: ['F', 'M']
            });

            expect(disaggSql).toContain('WITH base_pop AS');
            expect(disaggSql).toContain('ag AS (');
            expect(disaggSql).toContain('report_builder_dim_age_group');
            expect(disaggSql).toContain("ac.code = 'HMIS_106A'");
            expect(disaggSql).toContain('genders AS (');
            expect(disaggSql).toContain("SELECT 'F' AS gender");
            expect(disaggSql).toContain('cnt AS (');
            expect(disaggSql).toContain('COUNT(DISTINCT base_pop.patient_id) AS value');
            expect(disaggSql).toContain('CROSS JOIN genders g');
            expect(disaggSql).toContain('LEFT JOIN cnt');
            expect(disaggSql).toContain('COALESCE(cnt.value, 0)');
        });

        it('should handle only female gender', () => {
            const populationSql = 'SELECT DISTINCT patient_id FROM patients WHERE active = 1';

            const disaggSql = generateAgeSexDisaggregationSql({
                populationSql,
                ageCategoryCode: 'HTS',
                genders: ['F']
            });

            expect(disaggSql).toContain("'F'");
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty genders array by defaulting to both', () => {
            const populationSql = 'SELECT DISTINCT patient_id FROM patients WHERE active = 1';

            const disaggSql = generateAgeSexDisaggregationSql({
                populationSql,
                ageCategoryCode: 'HMIS_106A',
                genders: []
            });

            // Should default to both genders
            expect(disaggSql).toContain("'F'");
            expect(disaggSql).toContain("'M'");
        });

        it('should escape single quotes in age category code', () => {
            const populationSql = 'SELECT DISTINCT patient_id FROM patients WHERE active = 1';

            const disaggSql = generateAgeSexDisaggregationSql({
                populationSql,
                ageCategoryCode: "O'Malley",
                genders: ['F']
            });

            expect(disaggSql).toContain("ac.code = 'O''Malley'");
        });
    });

    describe('Caching', () => {
        it('should cache compilation results', async () => {
            const indicator = createIndicator({
                uuid: 'cached-indicator',
                code: 'CACHED',
                kind: 'BASE',
                sqlTemplate: 'SELECT DISTINCT patient_id FROM table'
            });

            const getIndicator = createMockGetIndicator(new Map());

            // First call
            const result1 = await compilePopulationSql(indicator, getIndicator);

            // Clear the mock to ensure it's not called again
            const newGetIndicator = createMockGetIndicator(new Map());

            // Second call with different getIndicator (should use cache)
            const result2 = await compilePopulationSql(indicator, newGetIndicator);

            expect(result1.sql).toBe(result2.sql);
        });

        it('should clear cache when requested', async () => {
            const indicator = createIndicator({
                uuid: 'test-uuid',
                code: 'TEST',
                kind: 'BASE',
                sqlTemplate: 'SELECT DISTINCT patient_id FROM table'
            });

            const getIndicator = createMockGetIndicator(new Map());

            await compilePopulationSql(indicator, getIndicator);
            clearCompilationCache();

            // Should re-compile after cache clear
            const result = await compilePopulationSql(indicator, getIndicator);

            expect(result.sql).toContain('SELECT DISTINCT');
        });
    });
});
