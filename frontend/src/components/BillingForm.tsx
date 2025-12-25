import React, { useEffect, useState } from 'react';
import { Box, TextField, Button, MenuItem, Autocomplete } from '@mui/material';
import client from '../api/client';

type Props = {
  // onSubmit receives the data object: { patient, amount, currency, description, acte }
  onSubmit: (data: Record<string, any>) => void;
};

export default function BillingForm({ onSubmit }: Props){
  const [patients, setPatients] = useState<any[]>([]);
  const [loadingPatients, setLoadingPatients] = useState<boolean>(false);
  const [actes, setActes] = useState<any[]>([]);
  const [loadingActes, setLoadingActes] = useState<boolean>(false);
  const [form, setForm] = useState<Record<string, any>>({ patient: '', amount: 0, currency: 'CDF' });

  useEffect(()=>{
    let mounted = true;
    setLoadingPatients(true);
    client.get('/api/patients/').then(r=>{
      if(!mounted) return;
      setPatients(r.data || []);
    }).catch(e=> console.error(e)).finally(()=> setLoadingPatients(false));
    return ()=>{ mounted = false };
  },[]);

  useEffect(()=>{
    let mounted = true;
    setLoadingActes(true);
    client.get('/api/actes/').then(r=>{
      if(!mounted) return;
      setActes(r.data || []);
    }).catch(e=> console.error(e)).finally(()=> setLoadingActes(false));
    return ()=>{ mounted = false };
  },[]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target as HTMLInputElement;
    setForm({...form, [name]: value});
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // pass selected patient id
    onSubmit(form);
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display:'flex', flexDirection:'column', gap:1 }}>
      <Autocomplete
        options={patients}
        getOptionLabel={(opt:any) => `${opt.last_name || ''} ${opt.first_name || ''}`.trim() || opt.medical_record_number || opt.id}
        loading={loadingPatients}
        onChange={(e, value) => setForm({...form, patient: value ? value.id : ''})}
        renderInput={(params) => <TextField {...params} label="Patient (recherche)" />}
      />
      <Autocomplete
        options={actes}
        getOptionLabel={(opt:any) => opt.name || opt.code || String(opt.id)}
        loading={loadingActes}
        onChange={(e, value)=>{
          if(value){
            setForm({...form, acte: value.id, amount: value.amount, currency: value.currency || form.currency, description: value.name});
          } else {
            setForm({...form, acte: '', amount: 0});
          }
        }}
        renderInput={(params)=> <TextField {...params} label="Acte (sélection)" />}
      />
      <TextField name="amount" label="Montant" type="number" value={form.amount||0} onChange={handleChange} />
      <TextField name="description" label="Description" value={form.description||''} onChange={handleChange} />
      <TextField select name="currency" label="Devise" value={form.currency||'CDF'} onChange={handleChange}>
        <MenuItem value="CDF">Franc Congolais (CDF)</MenuItem>
        <MenuItem value="USD">Dollar US (USD)</MenuItem>
      </TextField>
      {/* status and insurance_reference removed */}
      <Button type="submit" variant="contained">Enregistrer</Button>
    </Box>
  );
}
