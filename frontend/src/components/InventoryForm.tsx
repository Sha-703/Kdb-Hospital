import React from 'react';
import { Box, TextField, Button } from '@mui/material';

type Props = {
  value: Record<string, any>;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
};

export default function InventoryForm({ value, onChange, onSubmit }: Props){
  return (
    <Box component="form" onSubmit={onSubmit} sx={{ display:'flex', flexDirection:'column', gap:1 }}>
      <TextField name="sku" label="SKU" value={value.sku||''} onChange={onChange} />
      <TextField name="name" label="Nom" value={value.name||''} onChange={onChange} />
      <TextField name="description" label="Description" value={value.description||''} onChange={onChange} multiline rows={2} />
      <TextField name="quantity" label="Quantité" type="number" value={value.quantity||0} onChange={onChange} />
      <TextField name="unit" label="Unité" value={value.unit||'pcs'} onChange={onChange} />
      <TextField name="reorder_level" label="Seuil de réappro" type="number" value={value.reorder_level||0} onChange={onChange} />
      <TextField name="location" label="Emplacement" value={value.location||''} onChange={onChange} />
      <Button type="submit" variant="contained">Enregistrer</Button>
    </Box>
  );
}
