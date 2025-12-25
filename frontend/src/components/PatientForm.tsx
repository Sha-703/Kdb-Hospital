import React from 'react';
import { Box, TextField, Button, MenuItem } from '@mui/material';

const GENDER = [
  { value: 'M', label: 'Masculin' },
  { value: 'F', label: 'Féminin' },
  { value: 'O', label: 'Autre' },
];

type Props = {
  value: Record<string, any>;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
};

export default function PatientForm({ value, onChange, onSubmit }: Props){
  return (
    <Box component="form" onSubmit={onSubmit} sx={{ display:'flex', flexDirection:'column', gap:1 }}>
      <TextField name="first_name" label="Prénom" value={value.first_name||''} onChange={onChange} />
      <TextField name="last_name" label="Nom" value={value.last_name||''} onChange={onChange} />
      <TextField name="birth_date" label="Date de naissance" type="date" InputLabelProps={{ shrink:true }} value={value.birth_date||''} onChange={onChange} />
      <TextField select name="gender" label="Genre" value={value.gender||''} onChange={onChange}>
        {GENDER.map(g=> <MenuItem key={g.value} value={g.value}>{g.label}</MenuItem>)}
      </TextField>
      <TextField name="phone" label="Téléphone" value={value.phone||''} onChange={onChange} />
      <TextField name="email" label="Email" value={value.email||''} onChange={onChange} />
      {value.medical_record_number ? (
        <TextField name="medical_record_number" label="N° Dossier" value={value.medical_record_number||''} disabled />
      ) : null}
      <TextField name="address" label="Adresse" value={value.address||''} onChange={onChange} multiline rows={2} />
      <TextField name="allergies" label="Allergies" value={value.allergies||''} onChange={onChange} multiline rows={2} />
      <TextField name="notes" label="Notes" value={value.notes||''} onChange={onChange} multiline rows={2} />
      <Button type="submit" variant="contained">Enregistrer</Button>
    </Box>
  );
}
