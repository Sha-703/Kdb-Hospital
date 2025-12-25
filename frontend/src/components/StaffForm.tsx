import React from 'react';
import { Box, TextField, Button, MenuItem } from '@mui/material';
import { ROLES } from '../constants/roles';

type Props = {
  value: Record<string, any>;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
};

export default function StaffForm({ value, onChange, onSubmit }: Props){
  return (
    <Box component="form" onSubmit={onSubmit} sx={{ display:'flex', flexDirection:'column', gap:1 }}>
      {/* Names removed from Staff model; staff optionally link to a User account instead */}
      <TextField select name="role" label="Rôle" value={value.role||''} onChange={onChange}>
        {ROLES.map(r=> <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
      </TextField>
      <TextField name="email" label="Email" value={value.email||''} onChange={onChange} />
      <TextField name="phone" label="Téléphone" value={value.phone||''} onChange={onChange} />
          <TextField name="username" label="Nom d'utilisateur (optionnel)" value={value.username||''} onChange={onChange} />
          <TextField name="password" label="Mot de passe (optionnel)" type="password" value={value.password||''} onChange={onChange} />
      
      <Button type="submit" variant="contained">Enregistrer</Button>
    </Box>
  );
}
