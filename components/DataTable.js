import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, SearchIcon, ChevronLeft, ChevronRight } from "@/components/icons";

function SortIcon({ direction }) {
  if (!direction) return <span className="dt-sort-idle">&#8597;</span>;
  return direction === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
}

export function DataTable({
  columns,
  data,
  searchable = true,
  searchPlaceholder = "Search…",
  pageSize = 20,
  onRowClick,
  emptyMessage = "No results.",
  stickyHeader = false,
  compact = false,
}) {
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let rows = data || [];
    if (search) {
      const needle = search.toLowerCase();
      rows = rows.filter((row) =>
        columns.some((col) => {
          const val = col.accessor ? col.accessor(row) : row[col.key];
          return val != null && String(val).toLowerCase().includes(needle);
        })
      );
    }
    if (sortCol != null) {
      const col = columns[sortCol];
      if (col?.sortAccessor || col?.accessor) {
        rows = [...rows].sort((a, b) => {
          const av = col.sortAccessor ? col.sortAccessor(a) : (col.accessor ? col.accessor(a) : a[col.key]);
          const bv = col.sortAccessor ? col.sortAccessor(b) : (col.accessor ? col.accessor(b) : b[col.key]);
          if (av == null && bv == null) return 0;
          if (av == null) return 1;
          if (bv == null) return -1;
          if (typeof av === "number" && typeof bv === "number") {
            return sortDir === "asc" ? av - bv : bv - av;
          }
          const cmp = String(av).localeCompare(String(bv));
          return sortDir === "asc" ? cmp : -cmp;
        });
      }
    }
    return rows;
  }, [data, search, sortCol, sortDir, columns]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  function handleSort(idx) {
    if (!columns[idx]?.sortable) return;
    if (sortCol === idx) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(idx);
      setSortDir("asc");
    }
    setPage(0);
  }

  function handleSearch(v) {
    setSearch(v);
    setPage(0);
  }

  return (
    <div className="dt-wrapper">
      {searchable && (
        <div className="dt-toolbar">
          <div className="pill muted-text search-pill" style={{ flex: 1, maxWidth: 320 }}>
            <SearchIcon />
            <input
              className="pill-input"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <div className="dt-info">
            {filtered.length} {filtered.length === 1 ? "row" : "rows"}
          </div>
        </div>
      )}

      <div className={`dt-table-card${compact ? " dt-compact" : ""}`}>
        <div className="dt-table-scroll">
          <table className="dt-table">
            <thead>
              <tr>
                {columns.map((col, i) => (
                  <th
                    key={col.key || i}
                    className={`dt-th${col.sortable ? " dt-sortable" : ""}${sortCol === i ? " dt-sorted" : ""}`}
                    style={{
                      width: col.width,
                      minWidth: col.minWidth,
                      textAlign: col.align || "left",
                    }}
                    onClick={() => handleSort(i)}
                  >
                    <span className="dt-th-content">
                      {col.header}
                      {col.sortable && <SortIcon direction={sortCol === i ? sortDir : null} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="dt-empty">{emptyMessage}</td>
                </tr>
              )}
              {paged.map((row, ri) => (
                <tr
                  key={row.id || row._idx || ri}
                  className={`dt-tr${onRowClick ? " dt-clickable" : ""}`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col, ci) => (
                    <td
                      key={col.key || ci}
                      className="dt-td"
                      style={{ textAlign: col.align || "left" }}
                    >
                      {col.render ? col.render(row, ri) : (col.accessor ? col.accessor(row) : row[col.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="dt-pagination">
            <button
              className="dt-page-btn"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={14} />
            </button>
            <span className="dt-page-info">
              Page {page + 1} of {totalPages}
            </span>
            <button
              className="dt-page-btn"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default DataTable;
