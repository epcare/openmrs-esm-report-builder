import React, { useCallback, useEffect, useMemo, useState } from "react";
import PivotTableUI from "react-pivottable/PivotTableUI";
import TableRenderers from "react-pivottable/TableRenderers";
import Plot from "react-plotly.js";
import createPlotlyRenderers from "react-pivottable/PlotlyRenderers";
import Illustration from "./data-visualizer-illustration.component";
import type { Indicator, Item, ReportType, ReportCategory, RenderType } from "./types";
import {
  ArrowLeft,
  ArrowRight,
  Catalog,
  ChevronDown,
  ChevronUp,
  CrossTab,
  Intersect,
  ImageService,
  SendAlt,
  DocumentDownload,
  Save,
  List as ListIcon,
} from "@carbon/react/icons";
import {
  RadioButton,
  RadioButtonGroup,
  InlineLoading,
  Select,
  SelectItem,
  Accordion,
  AccordionItem,
  Button,
  ButtonSet,
  ComboBox,
  ContentSwitcher,
  DataTableSkeleton,
  DatePicker,
  DatePickerInput,
  Form,
  FormGroup,
  FormLabel,
  Layer,
  Modal,
  Stack,
  Switch,
  TextInput,
  TextArea,
  Tile,
} from "@carbon/react";
import ReportingHomeHeader from "./components/header/header.component";
import {
  CQIReportHeaders,
  reportIndicators,
  dynamicReportOptions,
  personNames,
  Address,
  Demographics,
  AppointmentIndicators,
} from "./constants";
import DataList from "./components/data-table/data-table.component";
import CQIDataList from "./components/cqi-components/cqi-data-table.component";
import EmptyStateIllustration from "./components/empty-state/empty-state-illustration.component";
import Panel from "./components/panel/panel.component";
import pivotTableStyles from "!!raw-loader!react-pivottable/pivottable.css";
import styles from "./data-visualizer.scss";
import {
  createColumns,
  downloadReport,
  extractDate,
  formatDate,
  getCategoryIndicator,
  getCohortCategory,
  getDateRange,
  getReport,
  mapDataElements,
  mapOrderDataElements,
  saveReport,
  sendReportToDHIS2,
  useGetEncounterType,
  useGetOrderTypes,
  useGetReportCategories,
  useGetReportLibrary,
} from "./data-visualizer.resource";
import dayjs from "dayjs";
import { showModal, showNotification, showToast } from "@openmrs/esm-framework";
import ModifierComponent from "./components/popover/modifier-panel";
import ReportParameterModal from "./report-parameter-modal.component";
import type { LinelistParameter } from "../../types/linelist-types";
import {
  RELATIVE_PERIOD_OPTIONS,
  type RelativePeriod,
  resolveRelativePeriod,
} from "../../utils/parameter-resolution";

// Import parameter input components
import DateParameterInput from "./parameter-inputs/date-parameter-input.component";
import NumberParameterInput from "./parameter-inputs/number-parameter-input.component";
import BooleanParameterInput from "./parameter-inputs/boolean-parameter-input.component";
import ListParameterInput from "./parameter-inputs/list-parameter-input.component";
import LocationParameterInput from "./parameter-inputs/location-parameter-input.component";
import ConceptParameterInput from "./parameter-inputs/concept-parameter-input.component";
import IdentifierTypeParameterInput from "./parameter-inputs/identifier-type-parameter-input.component";
import PersonAttributeParameterInput from "./parameter-inputs/person-attribute-parameter-input.component";
import TextParameterInput from "./parameter-inputs/text-parameter-input.component";

type ChartType = "list" | "pivot" | "aggregate" | "linelist";
type ReportingDuration = "fixed" | "relative";
export type CQIReportingCohort =
  | "Patients with encounters"
  | "Patients on appointment";

type ReportLibraryItem = {
  uuid: string;
  name: string;
  description?: string;
  code?: string;
  sourceType?: string;
  reportDefinitionUuid?: string;
  reportBuilderReportUuid?: string;
  reportType?: string;
  migrated?: boolean;
  retired?: boolean;
  category?: {
    uuid?: string;
    name?: string;
    display?: string;
    description?: string;
  };
  metaJson?: string;
};

const DataVisualizer: React.FC = () => {
  const PlotlyRenderers = createPlotlyRenderers(Plot);

  const [tableHeaders, setTableHeaders] = useState([]);
  const [data, setData] = useState([]);
  const [pivotTableData, setPivotTableData] = useState<any[]>([]);
  const [chartType, setChartType] = useState<ChartType>("list");
  const [reportType, setReportType] = useState<ReportType>("fixed");
  const [reportCategory, setReportCategory] = useState<{
    category?: ReportCategory;
    renderType?: RenderType;
    categoryUuid?: string;
    categoryName?: string;
  }>({
    category: undefined,
    renderType: undefined,
    categoryUuid: undefined,
    categoryName: undefined,
  });
  const [reportingDuration, setReportingDuration] =
    useState<ReportingDuration>("fixed");

  const { reportLibrary } = useGetReportLibrary();
  const { reportCategories } = useGetReportCategories();

  const reportTypes = useMemo(
    () =>
      (reportCategories ?? []).map((category) => ({
        id: category?.uuid,
        key: category?.uuid,
        label: category?.name,
        name: category?.name,
        uuid: category?.uuid,
      })),
    [reportCategories]
  );

  const reportPeriod = [
    { id: "today", label: "Today" },
    { id: "week", label: "This Week" },
    { id: "month", label: "This Month" },
    { id: "quarter", label: "This Quarter" },
    { id: "lastQuarter", label: "Last Quarter" },
  ];

  const toReportOption = (report: ReportLibraryItem) => ({
    id:
      report?.reportDefinitionUuid ||
      report?.reportBuilderReportUuid ||
      report?.uuid,
    uuid: report?.uuid,
    label: report?.name,
    name: report?.name,
    sourceType: report?.sourceType,
    reportType: report?.reportType,
    code: report?.code,
    category: report?.category?.name,
    metaJson: report?.metaJson,
  });

  const getReportsByCategoryName = useCallback(
    (categoryName: string) => {
      return (reportLibrary ?? [])
        .filter(
          (report: ReportLibraryItem) =>
            report?.category?.name?.toLowerCase() === categoryName?.toLowerCase()
        )
        .map(toReportOption);
    },
    [reportLibrary]
  );

  const facilityReports = useMemo(
    () => getReportsByCategoryName("FACILITY REPORTS"),
    [getReportsByCategoryName]
  );

  const donorReports = useMemo(
    () => getReportsByCategoryName("MER INDICATOR REPORTS"),
    [getReportsByCategoryName]
  );

  const nationalReports = useMemo(
    () => getReportsByCategoryName("NATIONAL REPORTS"),
    [getReportsByCategoryName]
  );

  const cqiReports = useMemo(
    () => getReportsByCategoryName("CQI REPORTS"),
    [getReportsByCategoryName]
  );

  const integrationDataExports = useMemo(
    () => getReportsByCategoryName("Integration Data Exports"),
    [getReportsByCategoryName]
  );

  const [reportingPeriod, setReportingPeriod] = useState<Item | null>(null);
  const [selectedIndicators, setSelectedIndicators] =
    useState<Indicator | null>(null);
  const [selectedReport, setSelectedReport] = useState<Item | null>(null);
  const [cqiReportingCohort, setCQIReportingCohort] =
    useState<CQIReportingCohort>("Patients with encounters");

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [showLineList, setShowLineList] = useState(false);
  const [availableParameters, setAvailableParameters] = useState([]);
  const [selectedParameters, setSelectedParameters] = useState<
    Array<Indicator>
  >([]);
  const [showFilters, setShowFilters] = useState(true);
  const [reportName, setReportName] = useState("Patient List");
  const { encounterTypes } = useGetEncounterType();
  const { orderTypes } = useGetOrderTypes();
  const [saveReportModal, setSaveReportModal] = useState(false);
  const [reportTitle, setReportTitle] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [htmlContent, setHTML] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSendingReport, setIsSendingReport] = useState(false);
  const [dhisJson, setDhisJson] = useState({});
  const [parameterModalOpen, setParameterModalOpen] = useState(false);
  const [reportParameters, setReportParameters] = useState<LinelistParameter[]>([]);
  const [parameterValues, setParameterValues] = useState<Record<string, any>>({});

  // Parameter state for inline rendering
  const [paramErrors, setParamErrors] = useState<Record<string, string>>({});
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});
  const [dateMode, setDateMode] = useState<'FIXED' | 'RELATIVE'>('FIXED');
  const [relativePeriod, setRelativePeriod] = useState<RelativePeriod | ''>('');

  const [selectedDynamicReportType, setSelectedDynamicReportType] =
    useState<Item | null>(null);
  const [dynamicReportTypes, setDynamicReportTypes] = useState([]);

  const hasFixedCategory = !!reportCategory.categoryUuid;
  const hasDynamicCategory = !!selectedDynamicReportType;

  useEffect(() => {
    setSelectedReport(null);
    setData([]);
    setPivotTableData([]);
    setHTML("");
    setShowLineList(false);
  }, [reportCategory, reportType]);

  const handleSelectedReport = ({ selectedItem }) => {
    console.log('=== handleSelectedReport called ===');
    console.log('selectedItem:', selectedItem);

    setSelectedReport(selectedItem ?? null);

    // Parse parameters from metaJson and initialize default values
    if (selectedItem?.metaJson) {
      try {
        const meta = JSON.parse(selectedItem.metaJson);
        console.log('Parsed metaJson:', meta);

        if (meta?.parameters && Array.isArray(meta.parameters)) {
          console.log('Found parameters in metaJson:', meta.parameters);
          console.log('Number of parameters:', meta.parameters.length);
          meta.parameters.forEach((param, idx) => {
            console.log(`  Param ${idx}:`, param);
          });
          setReportParameters(meta.parameters);

          // Initialize parameter values with defaults
          const defaults: Record<string, any> = {};
          meta.parameters.forEach((param) => {
            if (param.defaultValue) {
              defaults[param.name] = param.defaultValue;
            } else if (param.type === 'DATE' || param.type === 'DATETIME') {
              // Set default dates for date parameters without defaults
              if (param.name === 'startDate') {
                const startDate = new Date();
                startDate.setMonth(startDate.getMonth() - 6);
                defaults[param.name] = startDate.toISOString().split('T')[0];
              } else if (param.name === 'endDate') {
                defaults[param.name] = new Date().toISOString().split('T')[0];
              }
            }
          });
          setParameterValues(defaults);
        } else {
          console.log('No parameters found in metaJson, setting to empty array');
          setReportParameters([]);
          setParameterValues({});
        }
      } catch (error) {
        console.error('Failed to parse metaJson:', error);
        setReportParameters([]);
        setParameterValues({});
      }
    } else {
      console.log('No metaJson on selected report, setting parameters to empty array');
      setReportParameters([]);
      setParameterValues({});
    }

    // Reset date mode and errors for new selection
    setDateMode('FIXED');
    setRelativePeriod('');
    setParamErrors({});
    setSearchQueries({});

    // Detect linelist reports by reportType
    if (selectedItem?.reportType === 'LINE_LIST' || selectedItem?.reportType === 'linelist') {
      setChartType('linelist');
    } else if (chartType === 'linelist') {
      // Reset chart type if not a linelist report
      setChartType('list');
    }
  };

  const handleChartTypeChange = ({ name }) => {
    setChartType(name);
  };

  const handleReportTypeChange = ({ name }) => {
    setReportType(name);
    setSelectedReport(null);
    setSelectedIndicators(null);
    setAvailableParameters([]);
    setSelectedParameters([]);
    setData([]);
    setPivotTableData([]);
    setHTML("");
    setShowLineList(false);
    setReportCategory({
      category: undefined,
      renderType: undefined,
      categoryUuid: undefined,
      categoryName: undefined,
    });
    setSelectedDynamicReportType(null);
    setDynamicReportTypes([]);
    setChartType("list");
  };

  const handleReportingDurationChange = (period) => {
    setReportingDuration(period);
  };

  const handleCohortChange = (cohort) => {
    setCQIReportingCohort(cohort);
  };

  const showSaveReportModal = () => {
    setSaveReportModal(true);
  };

  const closeReportModal = () => {
    setSaveReportModal(false);
  };

  const confirmSendReport = () => {
    if (!selectedReport) return;

    const dispose = showModal("confirm-modal", {
      close: () => dispose(),
      submit: () => {
        handleSendToDHIS2();
        dispose();
      },
      report: selectedReport.label,
    });
  };

  const handleSendToDHIS2 = useCallback(() => {
    if (!selectedReport) return;

    setIsSendingReport(true);

    sendReportToDHIS2(selectedReport.id, dhisJson).then(
      (response) => {
        if (response.status === 200) {
          showToast({
            critical: true,
            title: "Sending Report To DHIS2",
            kind: "success",
            description: `Report ${selectedReport.label} sent Successfully`,
          });
        } else {
          showNotification({
            title: "Error sending report to DHIS2",
            kind: "error",
            critical: true,
            description: `Failed with error code ${response.status}, Contact System Administrator`,
          });
        }

        setIsSendingReport(false);
      },
      (error) => {
        showNotification({
          title: "Error sending report to DHIS2",
          kind: "error",
          critical: true,
          description: error?.message,
        });
        setIsSendingReport(false);
      }
    );
  }, [selectedReport, dhisJson]);

  const handleDownloadReport = useCallback(() => {
    if (!selectedReport) return;

    setIsDownloading(true);

    downloadReport({
      uuid: selectedReport.id,
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      reportCategory: reportCategory.category,
      reportingCohort: cqiReportingCohort,
    }).then(
      async (response) => {
        try {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const filename = response?.headers
            ?.get("Content-Disposition")
            ?.match(/filename=(.+)/)?.[1];

          const a = document.createElement("a");
          a.href = url;
          a.download = filename ?? `${selectedReport.label}.csv`;
          a.click();
          window.URL.revokeObjectURL(url);
        } catch (error) {
          showNotification({
            title: "Error downloading Report",
            kind: "error",
            critical: true,
            description: `Error downloading file: ${error?.message}`,
          });
        }
        setIsDownloading(false);
      },
      (error) => {
        showNotification({
          title: "Error downloading Report",
          kind: "error",
          critical: true,
          description: error?.message,
        });
        setIsDownloading(false);
      }
    );
  }, [startDate, endDate, selectedReport, reportCategory, cqiReportingCohort]);

  const handleSaveReport = useCallback(() => {
    saveReport({
      reportName: reportTitle,
      reportDescription: reportDescription,
      reportType: pivotTableData?.["rendererName"],
      columns: "",
      rows: "",
      report_request_object: JSON.stringify(pivotTableData),
    }).then(
      (response) => {
        if (response.status === 201) {
          showToast({
            critical: true,
            title: "Saving Report",
            kind: "success",
            description: `Report ${reportTitle} saved Successfully`,
          });
          setSaveReportModal(false);
        }
      },
      (error) => {
        showNotification({
          title: "Error saving report",
          kind: "error",
          critical: true,
          description: error?.message,
        });
      }
    );
  }, [reportDescription, pivotTableData, reportTitle]);

  const handleReportTitleChange = (event) => {
    setReportTitle(event.target.value);
  };

  const handleReportDescChange = (event) => {
    setReportDescription(event.target.value);
  };

  const moveAllFromLeftToRight = (selectedParameter) => {
    const updatedAvailableParameters = availableParameters.filter(
      (parameter) => parameter !== selectedParameter
    );
    setAvailableParameters(updatedAvailableParameters);
    setSelectedParameters([...selectedParameters, selectedParameter]);
  };

  const moveAllFromRightToLeft = (selectedParameter) => {
    const updatedSelectedParameters = selectedParameters.filter(
      (parameter) => parameter !== selectedParameter
    );
    setSelectedParameters(updatedSelectedParameters);

    let updatedAvailableParameters = [...availableParameters];

    selectedIndicators?.attributes?.filter((parameter) => {
      if (parameter === selectedParameter) {
        updatedAvailableParameters = [
          ...updatedAvailableParameters,
          selectedParameter,
        ];
      }
    });

    setAvailableParameters(updatedAvailableParameters);
  };

  const moveAllParametersLeft = () => {
    setAvailableParameters(selectedIndicators?.attributes ?? []);
    setSelectedParameters([]);
  };

  const moveAllParametersRight = () => {
    setSelectedParameters([...availableParameters, ...selectedParameters]);
    setAvailableParameters([]);
  };

  const handleIndicatorChange = useCallback(
    ({ selectedItem }) => {
      const indicator = selectedItem;

      if (!selectedItem) {
        setSelectedIndicators(null);
        setAvailableParameters([]);
        return;
      }

      getCategoryIndicator(selectedItem?.id, selectedItem?.type).then(
        (response) => {
          let results;

          switch (selectedItem.type) {
            case "PersonName":
              results = personNames;
              break;
            case "Demographics":
              results = Demographics;
              break;
            case "Address":
              results = Address;
              break;
            case "Appointment":
              results = AppointmentIndicators;
              break;
            case "Condition":
              results = mapDataElements(response, null, "concepts");
              break;
            case "Orders":
              results = mapOrderDataElements(
                response,
                "Orders",
                selectedItem.id
              );
              break;
            case "":
              results = mapDataElements(response, null, "concepts");
              break;
            default:
              results = mapDataElements(response?.results, selectedItem.type);
              break;
          }

          setSelectedIndicators(indicator);

          const filteredArray = results?.filter(
            (resultParameter) =>
              !selectedParameters?.some(
                (parameter) => parameter.id === resultParameter.id
              )
          );

          indicator.attributes = filteredArray;
          setAvailableParameters(indicator.attributes ?? []);
        },
        (error) => {
          showNotification({
            title: "Error fetching Indicators",
            kind: "error",
            critical: true,
            description: error?.message,
          });
        }
      );
    },
    [selectedParameters]
  );

  const handleSelectedReportDefinition = ({ selectedItem }) => {
    setSelectedReport(selectedItem ?? null);
  };

  const handleSelectedDynamicReportType = ({ selectedItem }) => {
    setSelectedDynamicReportType(selectedItem ?? null);
    setSelectedReport(null);
    setDynamicReportTypes([]);

    if (!selectedItem) {
      return;
    }

    if (selectedItem.id === "reportDefinition") {
      setDynamicReportTypes(facilityReports ?? []);
    } else {
      getCohortCategory(selectedItem.id).then((response) => {
        const responseResults =
          selectedItem.id === "patientSearch" ? response : response?.results;

        const reports =
          responseResults?.map((responseItem) => ({
            id: responseItem?.uuid,
            label: responseItem?.name,
          })) ?? [];

        setDynamicReportTypes(reports);
      });
    }
  };

  const handleFiltersToggle = () => {
    setShowFilters((prev) => !prev);
  };

  const handleStartDateChange = (selectedDate) => {
    setStartDate(selectedDate[0]);
  };

  const handleEndDateChange = (selectedDate) => {
    setEndDate(selectedDate[0]);
  };

  const handleReportCategoryChange = ({ selectedItem }) => {
    if (!selectedItem) {
      setReportCategory({
        category: undefined,
        renderType: undefined,
        categoryUuid: undefined,
        categoryName: undefined,
      });
      setSelectedReport(null);
      setChartType("list");
      return;
    }

    const categoryName = selectedItem?.name || selectedItem?.label || "";
    const categoryUuid = selectedItem?.uuid || selectedItem?.id;

    setSelectedReport(null);

    if (categoryName === "NATIONAL REPORTS") {
      setReportCategory({
        category: "national",
        renderType: "html",
        categoryUuid,
        categoryName,
      });
      setChartType("aggregate");
    } else if (categoryName === "CQI REPORTS") {
      setReportCategory({
        category: "cqi",
        renderType: undefined,
        categoryUuid,
        categoryName,
      });
      setChartType("list");
    } else if (categoryName === "MER INDICATOR REPORTS") {
      setReportCategory({
        category: "donor",
        renderType: "html",
        categoryUuid,
        categoryName,
      });
      setChartType("aggregate");
    } else if (categoryName === "Integration Data Exports") {
      setReportCategory({
        category: "integration",
        renderType: undefined,
        categoryUuid,
        categoryName,
      });
      setChartType("list");
    } else {
      setReportCategory({
        category: "facility",
        renderType: "list",
        categoryUuid,
        categoryName,
      });
      setChartType("list");
    }
  };

  const handleReportingPeriod = (selectedPeriod) => {
    setReportingPeriod(selectedPeriod?.selectedItem ?? null);

    if (!selectedPeriod?.selectedItem?.id) {
      return;
    }

    const dateRange = getDateRange(selectedPeriod?.selectedItem?.id);
    setStartDate(dateRange.start);
    setEndDate(dateRange.end);
  };

  const changeModifier = (selectedParameter, type) => {
    setSelectedParameters((selectedParameters) =>
      selectedParameters.map((parameter) =>
        parameter.id === selectedParameter.id
          ? {
            ...parameter,
            modifier: addORSubtract(selectedParameter?.modifier, type),
          }
          : parameter
      )
    );
  };

  const addORSubtract = (value, type) => {
    if (type === "add") {
      return value + 1;
    } else if (type === "subtract" && value > 1) {
      return value - 1;
    } else {
      return value;
    }
  };

  const showModifierPanel = (selectedParameter: Indicator) => {
    setSelectedParameters((selectedParameters) =>
      selectedParameters.map((parameter) =>
        parameter.id === selectedParameter.id
          ? {
            ...parameter,
            showModifierPanel: !selectedParameter?.showModifierPanel,
          }
          : parameter
      )
    );
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleUpdateReport = useCallback(() => {
    if (!selectedReport) return;

    // If report has parameters, validate and run with inline values
    if (reportParameters.length > 0) {
      // Validate required parameters
      const newErrors: Record<string, string> = {};
      for (const param of reportParameters) {
        const value = parameterValues[param.name];

        // Skip validation for date parameters in RELATIVE mode (they'll be resolved)
        if ((param.type === 'DATE' || param.type === 'DATETIME') && dateMode === 'RELATIVE') {
          const isStartDate = param.name.toLowerCase() === 'startdate' || param.name.toLowerCase() === 'start_date';
          const isEndDate = param.name.toLowerCase() === 'enddate' || param.name.toLowerCase() === 'end_date';
          if (isStartDate || isEndDate) continue;
        }

        if (param.required && (!value || value.toString().trim() === '')) {
          newErrors[param.name] = `${param.label} is required`;
        }
      }

      // Check relative period is selected in RELATIVE mode
      if (dateMode === 'RELATIVE' && !relativePeriod) {
        newErrors.relativePeriod = 'Please select a reporting period';
      }

      if (Object.keys(newErrors).length > 0) {
        setParamErrors(newErrors);
        showNotification({
          title: 'Validation Error',
          kind: 'error',
          critical: false,
          description: 'Please fill in all required parameters',
        });
        return;
      }

      // Clear errors and run report
      setParamErrors({});

      // Build parameter values (resolve relative dates if needed)
      const finalParams = { ...parameterValues };
      if (dateMode === 'RELATIVE' && relativePeriod) {
        const { start, end } = resolveRelativePeriod(relativePeriod);
        const dateParams = reportParameters.filter(p => p.type === 'DATE' || p.type === 'DATETIME');
        dateParams.forEach((param, index) => {
          if (index === 0) {
            finalParams[param.name] = formatDate(start);
          } else if (index === 1) {
            finalParams[param.name] = formatDate(end);
          }
        });
      }

      // Run report with parameters
      handleRunReportWithParameters(finalParams);
      return;
    }

    // Original logic for reports without parameters
    setHTML("");
    setShowLineList(true);
    setLoading(true);
    setShowFilters(false);

    getReport({
      uuid: selectedReport.id,
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      reportCategory: reportCategory as {
        category: ReportCategory;
        renderType?: RenderType;
      },
      reportingCohort: cqiReportingCohort,
    }).then(
      (response) => {
        if (response.status === 200) {
          let headers = [];
          let dataForReport: any = [];
          const reportData = response?.data;

          if (reportType === "fixed") {
            if (reportCategory.category === "cqi") {
              dataForReport = response?.data?.A;
              headers = CQIReportHeaders;
            } else if (reportCategory.renderType === "html") {
              setHTML(reportData?.html ?? "");
              setDhisJson(reportData?.json ?? {});
            } else if (chartType === "linelist" && reportData?._html) {
              // Handle linelist HTML from backend _html key
              setHTML(reportData?._html?.[0]?.html ?? "");
              setDhisJson(reportData?.json ?? {});
            } else {
              const responseReportName = Object.keys(reportData)[0];

              if (
                reportData[responseReportName] &&
                reportData[responseReportName][0]
              ) {
                let columnNames = Object.keys(reportData[responseReportName][0]);

                if (
                  selectedReport.id === "bf79f017-8591-4eaf-88c9-1cde33226517"
                ) {
                  columnNames = columnNames
                    .reverse()
                    .filter((column) => column !== "EDD" && column !== "Names");

                  headers = createColumns(columnNames);
                  dataForReport = reportData[responseReportName]
                    .filter((row) => row.PhoneNumber)
                    .map((row) => {
                      const formattedDate = extractDate(row.LastVisitDate);

                      if (row.PhoneNumber && row.PhoneNumber.startsWith("0")) {
                        return {
                          ...row,
                          PhoneNumber: "256" + row.PhoneNumber.substring(1),
                          LastVisitDate: formattedDate,
                        };
                      }

                      return row;
                    });
                } else {
                  headers = createColumns(columnNames);
                  dataForReport = reportData[responseReportName];
                }
              } else {
                setShowLineList(false);
              }
            }
          } else {
            if (chartType === "linelist" && reportData?._html) {
              // Handle linelist HTML from backend _html key
              setHTML(reportData?._html?.[0]?.html ?? "");
              setDhisJson(reportData?.json ?? {});
            } else if (reportData[0]) {
              const columnNames = Object.keys(reportData[0]);
              headers = createColumns(columnNames);
              dataForReport = reportData;
            } else {
              setShowLineList(false);
            }
          }

          setLoading(false);
          setShowFilters(false);
          setTableHeaders(headers);
          setData(dataForReport);
          setPivotTableData(dataForReport);
          setReportName(selectedReport?.label);
        }
      },
      (error) => {
        setLoading(false);
        setShowFilters(false);
        showNotification({
          title: "Error fetching report",
          kind: "error",
          critical: true,
          description: error?.message,
        });
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    cqiReportingCohort,
    chartType,
    dateMode,
    endDate,
    parameterValues,
    relativePeriod,
    reportCategory,
    reportParameters,
    reportType,
    selectedParameters,
    selectedReport,
    startDate,
    selectedDynamicReportType?.label,
    // Note: handleRunReportWithParameters omitted to avoid circular dependency (defined below)
  ]);

  const handleRunReportWithParameters = useCallback((params: Record<string, any>) => {
    console.log('=== handleRunReportWithParameters called ===');
    console.log('chartType:', chartType);
    console.log('Params from modal:', params);
    console.log('selectedReport:', selectedReport);

    setParameterValues(params);
    setParameterModalOpen(false);
    setHTML("");
    setShowLineList(true);
    setLoading(true);
    setShowFilters(false);

    // For linelist reports, only send the parameters defined in the report (from params)
    // For legacy reports, send startDate/endDate as before
    const requestOptions: any = {
      uuid: selectedReport.id,
      reportCategory: reportCategory as {
        category: ReportCategory;
        renderType?: RenderType;
      },
      reportingCohort: cqiReportingCohort,
      parameters: params,
    };

    console.log('requestOptions before date check:', requestOptions);

    // Only add startDate/endDate for non-linelist reports
    if (chartType !== 'linelist') {
      requestOptions.startDate = formatDate(startDate);
      requestOptions.endDate = formatDate(endDate);
      console.log('Added startDate/endDate (non-linelist report)');
    } else {
      console.log('NOT adding startDate/endDate (linelist report)');
    }

    console.log('Final requestOptions:', requestOptions);

    getReport(requestOptions).then(
      (response) => {
        if (response.status === 200) {
          let headers = [];
          let dataForReport: any = [];
          const reportData = response?.data;

          if (reportType === "fixed") {
            if (reportCategory.category === "cqi") {
              dataForReport = response?.data?.A;
              headers = CQIReportHeaders;
            } else if (reportCategory.renderType === "html") {
              setHTML(reportData?.html ?? "");
              setDhisJson(reportData?.json ?? {});
            } else if (chartType === "linelist" && reportData?._html) {
              // Handle linelist HTML from backend _html key
              setHTML(reportData?._html?.[0]?.html ?? "");
              setDhisJson(reportData?.json ?? {});
            } else {
              const responseReportName = Object.keys(reportData)[0];

              if (
                reportData[responseReportName] &&
                reportData[responseReportName][0]
              ) {
                let columnNames = Object.keys(reportData[responseReportName][0]);

                if (
                  selectedReport.id === "bf79f017-8591-4eaf-88c9-1cde33226517"
                ) {
                  columnNames = columnNames
                    .reverse()
                    .filter((column) => column !== "EDD" && column !== "Names");

                  headers = createColumns(columnNames);
                  dataForReport = reportData[responseReportName]
                    .filter((row) => row.PhoneNumber)
                    .map((row) => {
                      const formattedDate = extractDate(row.LastVisitDate);

                      if (row.PhoneNumber && row.PhoneNumber.startsWith("0")) {
                        return {
                          ...row,
                          PhoneNumber: "256" + row.PhoneNumber.substring(1),
                          LastVisitDate: formattedDate,
                        };
                      }

                      return row;
                    });
                } else {
                  headers = createColumns(columnNames);
                  dataForReport = reportData[responseReportName];
                }
              } else {
                setShowLineList(false);
              }
            }
          } else {
            if (chartType === "linelist" && reportData?._html) {
              // Handle linelist HTML from backend _html key
              setHTML(reportData?._html?.[0]?.html ?? "");
              setDhisJson(reportData?.json ?? {});
            } else if (reportData[0]) {
              const columnNames = Object.keys(reportData[0]);
              headers = createColumns(columnNames);
              dataForReport = reportData;
            } else {
              setShowLineList(false);
            }
          }

          setLoading(false);
          setShowFilters(false);
          setTableHeaders(headers);
          setData(dataForReport);
          setPivotTableData(dataForReport);
          setReportName(selectedReport?.label);
        }
      },
      (error) => {
        setLoading(false);
        setShowFilters(false);
        showNotification({
          title: "Error fetching report",
          kind: "error",
          critical: true,
          description: error?.message,
        });
      }
    );
  }, [
    cqiReportingCohort,
    chartType,
    endDate,
    reportCategory,
    reportType,
    selectedReport,
    startDate,
  ]);

  useEffect(() => {
    const styleElement = document.createElement("style");
    styleElement.textContent = `${pivotTableStyles}`;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  const selectedReportTypeItem =
    reportTypes?.find((item) => item.uuid === reportCategory.categoryUuid) ?? null;

  return (
    <>
      <ReportingHomeHeader illustrationComponent={<Illustration />} />

      <div className={styles.container}>
        <Accordion className={styles.accordion}>
          <AccordionItem
            className={styles.heading}
            title="Report filters"
            open={showFilters}
            onHeadingClick={handleFiltersToggle}
          >
            <div className={styles.formContainer}>
              <div className={`${styles.form} ${styles.formFirst}`}>
                <Form>
                  <Stack gap={2}>
                    <FormGroup legendText={``}>
                      <FormLabel className={styles.label}>
                        Type of report
                      </FormLabel>
                      <ContentSwitcher
                        size="sm"
                        selectedIndex={reportType === "fixed" ? 0 : 1}
                        onChange={handleReportTypeChange}
                      >
                        <Switch name="fixed" text="Fixed" />
                        <Switch name="dynamic" text="Dynamic" />
                      </ContentSwitcher>
                    </FormGroup>

                    {reportType === "fixed" && (
                      <>
                        <FormGroup legendText={``}>
                          <FormLabel className={styles.label}>
                            Which kind of report do you want to show?
                          </FormLabel>
                          <ComboBox
                            aria-label="Select Report Type"
                            id="ReportTypeCombobox"
                            items={reportTypes}
                            onChange={handleReportCategoryChange}
                            selectedItem={selectedReportTypeItem}
                            itemToString={(item) => item?.label ?? ""}
                            placeholder="Select report type"
                          />
                        </FormGroup>

                        {reportCategory.category === "facility" && (
                          <FormGroup legendText={``}>
                            <FormLabel className={styles.label}>
                              Facility Reports
                            </FormLabel>
                            <ComboBox
                              aria-label="Select facility report"
                              id="facilityReportsCombobox"
                              items={facilityReports ?? []}
                              onChange={handleSelectedReport}
                              selectedItem={selectedReport}
                              itemToString={(item) => item?.label ?? ""}
                              placeholder="Select facility report"
                              disabled={!hasFixedCategory}
                            />
                          </FormGroup>
                        )}

                        {reportCategory.category === "national" && (
                          <FormGroup legendText={``}>
                            <FormLabel className={styles.label}>
                              National Reports
                            </FormLabel>
                            <ComboBox
                              aria-label="Select national report"
                              id="nationalReportsCombobox"
                              items={nationalReports ?? []}
                              onChange={handleSelectedReport}
                              selectedItem={selectedReport}
                              itemToString={(item) => item?.label ?? ""}
                              placeholder="Select national report"
                              disabled={!hasFixedCategory}
                            />
                          </FormGroup>
                        )}

                        {reportCategory.category === "donor" && (
                          <FormGroup legendText={``}>
                            <FormLabel className={styles.label}>
                              Donor Reports
                            </FormLabel>
                            <ComboBox
                              aria-label="Select donor report"
                              id="donorReportsCombobox"
                              items={donorReports ?? []}
                              onChange={handleSelectedReport}
                              selectedItem={selectedReport}
                              itemToString={(item) => item?.label ?? ""}
                              placeholder="Select donor report"
                              disabled={!hasFixedCategory}
                            />
                          </FormGroup>
                        )}

                        {reportCategory.category === "cqi" && (
                          <FormGroup legendText={``}>
                            <FormLabel className={styles.label}>
                              CQI Reports
                            </FormLabel>
                            <ComboBox
                              aria-label="Select CQI report"
                              id="CQIReportsCombobox"
                              items={cqiReports ?? []}
                              onChange={handleSelectedReport}
                              selectedItem={selectedReport}
                              itemToString={(item) => item?.label ?? ""}
                              placeholder="Select CQI report"
                              disabled={!hasFixedCategory}
                            />
                          </FormGroup>
                        )}

                        {reportCategory.category === "integration" && (
                          <FormGroup legendText={``}>
                            <FormLabel className={styles.label}>
                              Integration Data Exports
                            </FormLabel>
                            <ComboBox
                              aria-label="Select Integration Data Exports"
                              id="integrationDataExportCombobox"
                              items={integrationDataExports ?? []}
                              onChange={handleSelectedReport}
                              selectedItem={selectedReport}
                              itemToString={(item) => item?.label ?? ""}
                              placeholder="Select integration export"
                              disabled={!hasFixedCategory}
                            />
                          </FormGroup>
                        )}

                        {reportCategory.category === "cqi" && (
                          <FormGroup legendText={``}>
                            <FormLabel className={styles.label}>
                              Select your cohort of interest
                            </FormLabel>
                            <RadioButtonGroup
                              legendText=""
                              name="patientCohort"
                              onChange={handleCohortChange}
                              defaultSelected="Patients with encounters"
                            >
                              <RadioButton
                                id="patient_with_encounters"
                                labelText="Patient with encounters"
                                value="Patients with encounters"
                              />
                              <RadioButton
                                id="patients_on_appointment"
                                labelText="Patients on appointment"
                                value="Patients on appointment"
                              />
                            </RadioButtonGroup>
                          </FormGroup>
                        )}
                      </>
                    )}

                    {reportType === "dynamic" && (
                      <Stack gap={2}>
                        <FormGroup legendText={``}>
                          <FormLabel className={styles.label}>
                            Which kind of dynamic report type do you want to
                            base on?
                          </FormLabel>
                          <ComboBox
                            aria-label="Select dynamic report type"
                            id="dynamicReportOptions"
                            items={dynamicReportOptions}
                            onChange={handleSelectedDynamicReportType}
                            selectedItem={selectedDynamicReportType}
                            itemToString={(item) => item?.label ?? ""}
                            placeholder="Select dynamic report type"
                          />
                        </FormGroup>

                        {selectedDynamicReportType && (
                          <FormGroup legendText={``}>
                            <FormLabel className={styles.label}>
                              {selectedDynamicReportType?.label ?? "Report"}
                            </FormLabel>

                            <ComboBox
                              aria-label="Select report type"
                              id="reportTypeCombobox"
                              items={dynamicReportTypes ?? []}
                              onChange={handleSelectedReportDefinition}
                              selectedItem={selectedReport}
                              itemToString={(item) => item?.label ?? ""}
                              placeholder="Select report"
                              disabled={!hasDynamicCategory}
                            />
                          </FormGroup>
                        )}
                      </Stack>
                    )}
                  </Stack>
                </Form>
              </div>

              {/* Only show hardcoded parameters when a report is selected but has no parameters */}
              {selectedReport && reportParameters.length === 0 && (
                <div className={`${styles.form} ${styles.formRight}`}>
                  <Form>
                    <Stack gap={3}>
                      <FormGroup legendText={``}>
                        <FormLabel className={styles.label}>
                          Do you want your report to cover a fixed reporting
                          period or a relative one?
                        </FormLabel>
                        <RadioButtonGroup
                          legendText=""
                          name="reportingDuration"
                          onChange={handleReportingDurationChange}
                          defaultSelected="fixed"
                        >
                          <RadioButton
                            id="fixedPeriod"
                            labelText="Fixed period"
                            value="fixed"
                          />
                          <RadioButton
                            id="relativePeriod"
                            labelText="Relative period"
                            value="relative"
                          />
                        </RadioButtonGroup>
                      </FormGroup>

                      {reportingDuration === "fixed" && (
                        <FormGroup legendText={``} className={styles.dateForm}>
                          <DatePicker
                            datePickerType="single"
                            onChange={handleStartDateChange}
                            dateFormat={"d/m/Y"}
                            value={startDate}
                          >
                            <DatePickerInput
                              id="date-picker-input-id-start"
                              placeholder="dd/mm/yyyy"
                              labelText="Start Date"
                            />
                          </DatePicker>
                          <br />
                          <DatePicker
                            datePickerType="single"
                            onChange={handleEndDateChange}
                            dateFormat={"d/m/Y"}
                            value={endDate}
                          >
                            <DatePickerInput
                              id="date-picker-input-id-end"
                              placeholder="dd/mm/yyyy"
                              labelText="End Date"
                            />
                          </DatePicker>
                        </FormGroup>
                      )}

                      {reportingDuration === "relative" && (
                        <FormGroup legendText={``}>
                          <FormLabel className={styles.label}>
                            Select your desired reporting period
                          </FormLabel>

                          <ComboBox
                            ariaLabel="Select reporting period"
                            id="reportingPeriodCombobox"
                            items={reportPeriod}
                            placeholder="Choose the reporting period"
                            onChange={handleReportingPeriod}
                            selectedItem={reportingPeriod}
                            itemToString={(item) => item?.label ?? ""}
                          />
                        </FormGroup>
                      )}
                    </Stack>
                  </Form>
                </div>
              )}

              {/* Show inline parameters when report has parameters */}
              {selectedReport && reportParameters.length > 0 && (
                <div className={`${styles.form} ${styles.formRight}`}>
                  <Stack gap={5}>
                    {/* Date Mode Toggle - shown if report has date parameters */}
                    {reportParameters.some(p => p.type === 'DATE' || p.type === 'DATETIME') && (
                      <div style={{ marginBottom: '1rem' }}>
                        <label className="cds--label">Date Selection Mode</label>
                        <RadioButtonGroup
                          legendText=""
                          name="date-mode"
                          valueSelected={dateMode}
                          onChange={(mode) => {
                            setDateMode(mode as 'FIXED' | 'RELATIVE');
                            if (mode === 'FIXED') {
                              setRelativePeriod('');
                            }
                          }}
                        >
                          <RadioButton
                            id="date-mode-fixed"
                            labelText="Specific dates"
                            value="FIXED"
                          />
                          <RadioButton
                            id="date-mode-relative"
                            labelText="Relative period"
                            value="RELATIVE"
                          />
                        </RadioButtonGroup>
                      </div>
                    )}

                    {/* Relative Period Selector - shown in RELATIVE mode */}
                    {dateMode === 'RELATIVE' && reportParameters.some(p => p.type === 'DATE' || p.type === 'DATETIME') && (
                      <div style={{ marginBottom: '1rem', maxWidth: '300px' }}>
                        <Select
                          id="relative-period-select"
                          labelText="Select reporting period"
                          value={relativePeriod}
                          onChange={(e) => {
                            setRelativePeriod(e.target.value as RelativePeriod);
                          }}
                          size="sm"
                        >
                          <SelectItem value="" text="Select period" />
                          {RELATIVE_PERIOD_OPTIONS.map((option) => (
                            <SelectItem
                              key={option.value}
                              value={option.value}
                              text={option.label}
                            />
                          ))}
                        </Select>
                        {paramErrors.relativePeriod && (
                          <div style={{ color: '#da1e28', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                            {paramErrors.relativePeriod}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Render parameter inputs inline */}
                    {reportParameters.map((param) => {
                      const value = parameterValues[param.name] || '';
                      const error = paramErrors[param.name];

                      // Skip start/end date parameters in RELATIVE mode
                      if (dateMode === 'RELATIVE') {
                        const isStartDate = param.name.toLowerCase() === 'startdate' || param.name.toLowerCase() === 'start_date';
                        const isEndDate = param.name.toLowerCase() === 'enddate' || param.name.toLowerCase() === 'end_date';
                        if ((param.type === 'DATE' || param.type === 'DATETIME') && (isStartDate || isEndDate)) {
                          return null;
                        }
                      }

                      const commonProps = {
                        key: param.name,
                        parameter: param,
                        value,
                        error,
                        onChange: (newValue: any) => {
                          setParameterValues((prev) => ({ ...prev, [param.name]: newValue }));
                          if (paramErrors[param.name]) {
                            setParamErrors((prev) => {
                              const newErrors = { ...prev };
                              delete newErrors[param.name];
                              return newErrors;
                            });
                          }
                        },
                      };

                      switch (param.type) {
                        case 'DATE':
                        case 'DATETIME':
                          return <DateParameterInput {...commonProps} />;
                        case 'NUMBER':
                          return <NumberParameterInput {...commonProps} />;
                        case 'BOOLEAN':
                          return <BooleanParameterInput {...commonProps} />;
                        case 'LIST':
                          return <ListParameterInput {...commonProps} />;
                        case 'LOCATION':
                          return (
                            <LocationParameterInput
                              {...commonProps}
                              onSearchQueryChange={(query) => setSearchQueries((prev) => ({ ...prev, [param.name]: query }))}
                            />
                          );
                        case 'CONCEPT':
                          return (
                            <ConceptParameterInput
                              {...commonProps}
                              searchQuery={searchQueries[param.name] || ''}
                              onSearchQueryChange={(query) => setSearchQueries((prev) => ({ ...prev, [param.name]: query }))}
                            />
                          );
                        case 'IDENTIFIER_TYPE':
                          return <IdentifierTypeParameterInput {...commonProps} />;
                        case 'PERSON_ATTRIBUTE':
                          return <PersonAttributeParameterInput {...commonProps} />;
                        case 'TEXT':
                        default:
                          return (
                            <TextParameterInput
                              {...commonProps}
                              onError={(error) => setParamErrors((prev) => ({ ...prev, [param.name]: error }))}
                            />
                          );
                      }
                    })}
                  </Stack>
                </div>
              )}

              {/* Show empty state when no report is selected */}
              {!selectedReport && (
                <div className={`${styles.form} ${styles.formRight}`}>
                  <div style={{ padding: '1rem', color: '#525252', fontStyle: 'italic', textAlign: 'center', marginTop: '2rem' }}>
                    Select a report above to configure and run
                  </div>
                </div>
              )}
            </div>

            <div>
              <Form>
                {reportType === "dynamic" && (
                  <Stack gap={2}>
                    <FormGroup legendText={``}>
                      <FormLabel className={styles.label}>Indicators</FormLabel>

                      <ComboBox
                        ariaLabel="Select indicators"
                        id="indicatorCombobox"
                        items={[
                          ...reportIndicators,
                          ...encounterTypes,
                          ...orderTypes,
                        ]}
                        placeholder="Choose the indicators"
                        onChange={handleIndicatorChange}
                        selectedItem={selectedIndicators}
                        itemToString={(item) => item?.label ?? ""}
                      />
                    </FormGroup>

                    <div className={styles.panelContainer}>
                      <Panel heading="Available parameters">
                        <ul className={styles.list}>
                          {availableParameters.map((parameter) => (
                            <li
                              role="menuitem"
                              className={styles.leftListItem}
                              key={parameter.label}
                              onClick={() => moveAllFromLeftToRight(parameter)}
                            >
                              {parameter.label}
                            </li>
                          ))}
                        </ul>
                      </Panel>

                      <div className={styles.paramsControlContainer}>
                        <Button
                          iconDescription="Move all parameters to the right"
                          kind="tertiary"
                          hasIconOnly
                          renderIcon={ArrowRight}
                          onClick={moveAllParametersRight}
                          role="button"
                          size="md"
                          disabled={availableParameters.length < 1}
                        />
                        <Button
                          iconDescription="Move all parameters to the left"
                          kind="tertiary"
                          hasIconOnly
                          renderIcon={ArrowLeft}
                          onClick={moveAllParametersLeft}
                          role="button"
                          size="md"
                          disabled={selectedParameters.length < 1}
                        />
                      </div>

                      <Panel heading="Selected parameters">
                        <ul className={styles.list}>
                          {selectedParameters.map((parameter) => (
                            <React.Fragment key={parameter.label}>
                              <li
                                className={`${styles.rightListItem} ${
                                  parameter?.showModifierPanel
                                    ? styles.openRightListItem
                                    : ""
                                } `}
                                role="menuitem"
                              >
                                <div className={styles.selectedListItem}>
                                  <div>
                                    <ArrowLeft
                                      className={styles.itemChevronUpDown}
                                      onClick={() =>
                                        moveAllFromRightToLeft(parameter)
                                      }
                                    />
                                  </div>
                                  {parameter.label}
                                  {![
                                    "PatientIdentifier",
                                    "PersonAttribute",
                                    "PersonName",
                                    "Demographics",
                                    "Address",
                                    "Condition",
                                    "Appointment",
                                    "Orders",
                                  ].includes(parameter?.type) ? (
                                    <div className={styles.modifierContainer}>
                                      <div>
                                        {parameter?.showModifierPanel ? (
                                          <ChevronUp
                                            className={styles.itemChevronUpDown}
                                            onClick={() =>
                                              showModifierPanel(parameter)
                                            }
                                          />
                                        ) : (
                                          <ChevronDown
                                            className={styles.itemChevronUpDown}
                                            onClick={() =>
                                              showModifierPanel(parameter)
                                            }
                                          />
                                        )}
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              </li>

                              <div
                                className={`${styles.fadeModifierContainer} ${
                                  parameter?.showModifierPanel
                                    ? styles.show
                                    : styles.hide
                                }`}
                              >
                                <ModifierComponent
                                  listItem={parameter}
                                  onChangeMostRecent={changeModifier}
                                />
                              </div>
                            </React.Fragment>
                          ))}
                        </ul>
                      </Panel>
                    </div>
                  </Stack>
                )}
              </Form>
            </div>
          </AccordionItem>
        </Accordion>
      </div>

      <section className={styles.section}>
        <div className={styles.contentSwitchContainer}>
          <ContentSwitcher
            size={`md`}
            selectedIndex={
              chartType === "linelist" ? 3 : chartType === "pivot" ? 1 : chartType === "aggregate" ? 2 : 0
            }
            onChange={handleChartTypeChange}
          >
            <Switch name="list" disabled={chartType === "aggregate" || chartType === "linelist"}>
              <div className={styles.switch}>
                <Catalog />
                <span>Patient list</span>
              </div>
            </Switch>
            <Switch name="pivot" disabled={chartType === "aggregate" || chartType === "linelist"}>
              <div className={styles.switch}>
                <CrossTab />
                <span>Pivot table</span>
              </div>
            </Switch>
            <Switch name="aggregate" disabled={chartType !== "aggregate"}>
              <div className={styles.switch}>
                <ImageService />
                <span>Aggregate Report</span>
              </div>
            </Switch>
            <Switch name="linelist" disabled={chartType !== "linelist"}>
              <div className={styles.switch}>
                <ListIcon />
                <span>Linelist</span>
              </div>
            </Switch>
          </ContentSwitcher>
        </div>

        <div className={styles.actionButtonContainer}>
          <ButtonSet>
            <Button
              size="md"
              kind="primary"
              onClick={handleUpdateReport}
              className={styles.actionButton}
              disabled={
                !selectedReport ||
                (reportType === "fixed" && !reportCategory.category) ||
                (reportType === "dynamic" && !selectedDynamicReportType)
              }
            >
              <Intersect />
              <span>View Report</span>
            </Button>

            {data.length > 0 || htmlContent !== "" ? (
              <>
                {chartType === "pivot" ? (
                  <Button
                    size="md"
                    kind="secondary"
                    iconDescription="Save Report"
                    onClick={showSaveReportModal}
                    className={styles.dsReportBtn}
                    renderIcon={Save}
                    hasIconOnly
                  />
                ) : null}

                {reportType === "fixed" ? (
                  isDownloading ? (
                    <InlineLoading />
                  ) : (
                    <Button
                      size="md"
                      kind="tertiary"
                      iconDescription="Download Report"
                      tooltipAlignment="end"
                      onClick={handleDownloadReport}
                      className={styles.dsReportBtn}
                      renderIcon={DocumentDownload}
                      hasIconOnly
                    />
                  )
                ) : null}

                {chartType === "aggregate" ? (
                  isSendingReport ? (
                    <InlineLoading />
                  ) : (
                    <Button
                      size="md"
                      kind="secondary"
                      iconDescription="Send Report to DHIS2"
                      tooltipAlignment="end"
                      onClick={confirmSendReport}
                      className={styles.dsReportBtn}
                      renderIcon={SendAlt}
                      hasIconOnly
                    />
                  )
                ) : null}
              </>
            ) : null}
          </ButtonSet>
        </div>
      </section>

      {showLineList ? (
        <>
          {loading && <DataTableSkeleton role="progressbar" />}

          {chartType === "list" && !loading && (
            <div className={styles.reportContainer}>
              <h3 className={styles.listHeading}>
                {reportName} ({dayjs(startDate).format("DD/MM/YYYY")} -{" "}
                {dayjs(endDate).format("DD/MM/YYYY")})
              </h3>
              <div className={styles.reportDataTable}>
                {reportCategory.category === "cqi" ? (
                  <CQIDataList columns={tableHeaders} data={data} />
                ) : (
                  <DataList
                    columns={tableHeaders}
                    data={data}
                    report={{
                      type: reportType,
                      name: selectedReport?.label ?? "",
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {chartType === "list" &&
            !loading &&
            selectedReport?.id === "bf79f017-8591-4eaf-88c9-1cde33226517" && (
              <div className={styles.sendReportBtn}>
                <Button
                  size="md"
                  kind="primary"
                  className={styles.actionButton}
                >
                  <SendAlt />
                  <span>Send Report to Family Connect</span>
                </Button>
              </div>
            )}

          {chartType === "pivot" && (
            <div className={styles.reportContainer}>
              <h3>Pivot Table</h3>
              <PivotTableUI
                data={pivotTableData}
                onChange={(s) => setPivotTableData(s)}
                renderers={{ ...TableRenderers, ...PlotlyRenderers }}
                {...pivotTableData}
              />
            </div>
          )}

          {chartType === "aggregate" && !loading && (
            <div className={styles.reportTableContainer}>
              <section className={styles.reportOptions}>
                <h3 className={styles.listHeading}>
                  {reportName} ({dayjs(startDate).format("DD/MM/YYYY")} -{" "}
                  {dayjs(endDate).format("DD/MM/YYYY")})
                </h3>
              </section>
              <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
            </div>
          )}

          {chartType === "linelist" && !loading && (
            <div className={styles.reportTableContainer}>
              <section className={styles.reportOptions}>
                <h3 className={styles.listHeading}>
                  {reportName} ({dayjs(startDate).format("DD/MM/YYYY")} -{" "}
                  {dayjs(endDate).format("DD/MM/YYYY")})
                </h3>
              </section>
              <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
            </div>
          )}

          {saveReportModal && (
            <Modal
              open
              size="sm"
              preventCloseOnClickOutside={true}
              hasScrollingContent={true}
              modalHeading="ENTER REPORT DETAILS"
              secondaryButtonText="Cancel"
              primaryButtonText="Save Report"
              onRequestClose={closeReportModal}
              onRequestSubmit={handleSaveReport}
            >
              <div>
                <TextInput
                  id="title"
                  labelText={`Report Title`}
                  onChange={handleReportTitleChange}
                  maxCount={50}
                  placeholder="Enter report title"
                />
                <TextArea
                  id="description"
                  className={styles.reportDescription}
                  labelText={`Report Description`}
                  onChange={handleReportDescChange}
                  rows={2}
                  placeholder="Enter report description"
                />
              </div>
            </Modal>
          )}

          {/* Parameter Modal */}
          <ReportParameterModal
            open={parameterModalOpen}
            onClose={() => setParameterModalOpen(false)}
            onRun={handleRunReportWithParameters}
            parameters={reportParameters}
            initialValues={parameterValues}
            loading={loading}
          />
        </>
      ) : (
        <Layer className={styles.layer}>
          <Tile className={styles.tile}>
            <EmptyStateIllustration />
            <p className={styles.content}>No data to display</p>
            <p className={styles.explainer}>
              Use the report filters above to build your reports
            </p>
          </Tile>
        </Layer>
      )}
    </>
  );
};

export default DataVisualizer;
