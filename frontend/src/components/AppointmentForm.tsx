import React from 'react';
import { Box, TextField, Button } from '@mui/material';

type Props = {
  value: Record<string, any>;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
};

export default function AppointmentForm({ value, onChange, onSubmit }: Props){
  return (
    <Box component="form" onSubmit={onSubmit} sx={{ display:'flex', flexDirection:'column', gap:1 }}>
      <TextField name="patient" label="Patient ID" value={value.patient||''} onChange={onChange} />
      <TextField name="staff" label="Staff ID" value={value.staff||''} onChange={onChange} />
      <TextField name="date" label="Date" type="date" InputLabelProps={{ shrink:true }} value={value.date||''} onChange={onChange} />
      <TextField name="location" label="Lieu" value={value.location||''} onChange={onChange} />
      <TextField name="reason" label="Motif" value={value.reason||''} onChange={onChange} multiline rows={2} />
      <Button type="submit" variant="contained">Enregistrer</Button>
    </Box>
  );
}
