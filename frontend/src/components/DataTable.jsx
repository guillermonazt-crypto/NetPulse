import React from 'react';
import { Box, IconButton, Typography, Stack, Chip } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Download } from '@mui/icons-material';

function exportCSV(rows, columns, filename) {
  const headers = columns.map((c) => c.headerName || c.field);
  const csvRows = [headers];
  rows.forEach((row) => {
    csvRows.push(columns.map((col) => {
      const val = row[col.field];
      if (col.valueFormatter) return col.valueFormatter(val);
      return val ?? '';
    }));
  });
  const csv = csvRows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function DataTable({
  rows,
  columns,
  loading,
  emptyText = 'Sin datos',
  exportFilename = 'export.csv',
  pageSize = 10,
  height = 400,
  sx = {},
}) {
  if (loading) return null;

  return (
    <Box sx={{ height: rows.length ? height : 200, width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
        <IconButton
          size="small"
          onClick={() => exportCSV(rows, columns, exportFilename)}
          disabled={!rows || rows.length === 0}
          title="Exportar CSV"
        >
          <Download fontSize="small" />
        </IconButton>
      </Box>
      <DataGrid
        rows={rows}
        columns={columns}
        autoHeight={rows.length <= pageSize}
        density="compact"
        pageSizeOptions={[5, 10, 25, 50]}
        initialState={{ pagination: { paginationModel: { pageSize } } }}
        disableRowSelectionOnClick
        getRowId={(row) => row.id}
        slots={{
          noRowsOverlay: () => (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Typography color="text.secondary" variant="body2">{emptyText}</Typography>
            </Box>
          ),
        }}
        slotProps={{
          columnHeaders: {
            sx: {
              backgroundColor: '#1e293b !important',
              '& .MuiDataGrid-columnHeaderTitle, & .MuiDataGrid-menuIcon, & .MuiSvgIcon-root': {
                color: '#ffffff',
              },
            },
          },
        }}
        sx={{
          border: 0,
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#1e293b',
          },
          '& .MuiDataGrid-columnHeaderTitle': {
            fontWeight: 700,
            fontSize: '0.8rem',
          },
          ...sx,
        }}
      />
    </Box>
  );
}

export default DataTable;
