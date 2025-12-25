import React from 'react';
import { Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';

type Column<T> = {
  field: string;
  title: string;
  render?: (row: T) => React.ReactNode;
};

type Props<T> = {
  columns: Column<T>[];
  rows: T[];
};

export default function DataList<T extends { id?: number | string }>({ columns, rows }: Props<T>){
  return (
    <Table>
      <TableHead>
        <TableRow>
          {columns.map(col => <TableCell key={col.field}>{col.title}</TableCell>)}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map(r => (
          <TableRow key={String((r as any).id)}>
            {columns.map(col => <TableCell key={col.field}>{col.render ? col.render(r) : (r as any)[col.field]}</TableCell>)}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
