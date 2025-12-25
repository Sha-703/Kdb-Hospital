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
  const [selectedActes, setSelectedActes] = useState<any[]>([]);

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
    // build billing items from selected actes
    const items = (selectedActes || []).map((a:any) => ({
      acte: a.id,
      description: a.name,
      quantity: 1,
      unit_price: a.amount || 0,
      currency: a.currency || form.currency || 'CDF',
      total: (Number(a.amount) || 0) * 1,
    }));

    const payload = { ...form, items };
    onSubmit(payload);
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
        multiple
        options={actes}
        getOptionLabel={(opt:any) => {
          // try to show parent > child when possible
          try{
            if(!opt) return '';
            const parentName = (opt.parent && typeof opt.parent === 'object' && opt.parent.name) ? opt.parent.name : (actes.find(a=>a.id === opt.parent)?.name || null);
            return parentName ? `${parentName} > ${opt.name}` : (opt.name || opt.code || String(opt.id));
          }catch(e){
            return opt.name || opt.code || String(opt.id);
          }
        }}
        loading={loadingActes}
        value={selectedActes}
        onChange={(e, value)=>{
          setSelectedActes(value || []);
          // update form summary: total amount and description
          const total = (value || []).reduce((s:any, it:any)=> s + (Number(it.amount) || 0), 0);
          const desc = (value || []).map((it:any)=> it.name).join('; ');
          setForm({...form, amount: total, description: desc, currency: (value && value.length ? (value[0].currency || form.currency) : form.currency)});
        }}
        renderInput={(params)=> <TextField {...params} label="Actes (sélection multiple)" />}
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
