import {
  DataTable,
  DataTableHeader,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableExpandRow,
  TableToolbar,
  TableExpandedRow,
  TableToolbarContent,
  TableToolbarSearch,
  Tile,
  TableExpandHeader,
} from "@carbon/react";
import {
  isDesktop,
  useLayoutType,
  usePagination,
} from "@openmrs/esm-framework";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import styles from "../data-table/data-tables.scss";
import RowDetail from "./detail.component";

interface ExtendedDataTableHeader extends DataTableHeader {
  isFlag?: boolean;
}

type FilterProps = {
  rowIds: Array<string>;
  headers: Array<ExtendedDataTableHeader>;
  cellsById: any;
  inputValue: string;
  getCellId: (rowId: string, key: string) => string;
};

interface ListProps {
  columns: Array<ExtendedDataTableHeader>;
  data: any;
}

const CQIDataList: React.FC<ListProps> = ({ columns, data }) => {
  const { t } = useTranslation();
  const layout = useLayoutType();
  const isTablet = layout === "tablet";
  const responsiveSize = isTablet ? "lg" : "sm";
  const [allRows, setAllRows] = useState([]);
  const pageSizes = [10, 20, 30, 40, 50];
  const [currentPageSize, setPageSize] = useState(10);

  const {
    goTo,
    results: paginatedList,
    currentPage,
  } = usePagination(data, currentPageSize);

  const handleFilter = ({
    rowIds,
    headers,
    cellsById,
    inputValue,
    getCellId,
  }: FilterProps): Array<string> => {
    return rowIds.filter((rowId) =>
      headers.some(({ key }) => {
        const cellId = getCellId(rowId, key);
        const filterableValue = cellsById[cellId]?.value;
        const filterTerm = inputValue.toLowerCase();

        if (
          typeof filterableValue === "boolean" ||
          filterableValue === undefined
        ) {
          return false;
        }

        return ("" + filterableValue).toLowerCase().includes(filterTerm);
      })
    );
  };

  useEffect(() => {
    const rows = paginatedList.map((item: any, index: number) => ({
      ...item,
      id: index.toString(),
    }));
    setAllRows(rows);
  }, [paginatedList]);

  return (
    <DataTable
      rows={allRows}
      headers={columns}
      filterRows={handleFilter}
      size={isTablet ? "lg" : "sm"}
      useZebraStyles
    >
      {({
        rows,
        headers,
        getHeaderProps,
        getTableProps,
        onInputChange,
        getRowProps,
        getExpandHeaderProps,
      }) => (
        <TableContainer className={styles.tableContainer}>
          <div className={styles.toolbarWrapper}>
            <TableToolbar size={responsiveSize}>
              <TableToolbarContent className={styles.toolbarContent}>
                <TableToolbarSearch
                  className={styles.searchbox}
                  expanded
                  onChange={onInputChange}
                  placeholder={t("searchThisList", "Search this list")}
                  size={responsiveSize}
                />
              </TableToolbarContent>
            </TableToolbar>
          </div>
          <Table {...getTableProps()}>
            <TableHead>
              <TableRow>
                <TableExpandHeader
                  enableToggle={true}
                  {...getExpandHeaderProps()}
                />
                {headers.map((header: ExtendedDataTableHeader) => (
                  <TableHeader
                    key={header.key}
                    className={`${styles.tableHeaderStyle} ${
                      header.isFlag ? styles.tableHeaderFlag : ""
                    }`}
                    {...getHeaderProps({ header })}
                  >
                    {header.header}
                  </TableHeader>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <React.Fragment key={row.id}>
                  <TableExpandRow {...getRowProps({ row })}>
                    {row.cells.map((cell) => {
                      const cellClassMap = {
                        Y: styles.greenCell,
                        N: styles.redCell,
                        NA: styles.grayCell,
                        ON: styles.yellowCell,
                      };

                      const colorClass =
                        cellClassMap[cell.value as keyof typeof cellClassMap];

                      return colorClass ? (
                        <TableCell
                          key={cell.id}
                          className={`${colorClass} ${styles.cellStyling}`}
                        />
                      ) : (
                        <TableCell key={cell.id}>{cell.value}</TableCell>
                      );
                    })}
                  </TableExpandRow>
                  {row.isExpanded && (
                    <TableExpandedRow
                      className={styles.expandedActiveVisitRow}
                      colSpan={headers.length + 1}
                    >
                      <RowDetail
                        reportItem={data.find(
                          (item) =>
                            item.art_number ===
                            row.cells.find(
                              (c) => c.info.header === "art_number"
                            )?.value
                        )}
                      />
                    </TableExpandedRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
          {rows.length === 0 && (
            <Tile className={styles.tile}>
              <p className={styles.content}>
                {t("noData", "No data to display")}
              </p>
            </Tile>
          )}
          <Pagination
            page={currentPage}
            pageSize={currentPageSize}
            pageSizes={pageSizes}
            totalItems={data?.length || 0}
            className={styles.pagination}
            onChange={({ pageSize, page }) => {
              if (pageSize !== currentPageSize) setPageSize(pageSize);
              if (page !== currentPage) goTo(page);
            }}
          />
        </TableContainer>
      )}
    </DataTable>
  );
};

export default CQIDataList;
