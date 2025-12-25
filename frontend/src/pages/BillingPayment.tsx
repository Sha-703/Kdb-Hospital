import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { Box, Typography, TextField, Button, Card, CardContent } from '@mui/material';
import { useNotifier } from '../contexts/Notifier';

const BillingPayment: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [billing, setBilling] = useState<any | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [currency, setCurrency] = useState<string>('CDF');

  useEffect(()=>{
    if(!id) return;
    client.get(`/api/billing/${id}/`).then(r=>{
      setBilling(r.data);
      setAmount(r.data.remaining_due || r.data.amount || 0);
      setCurrency(r.data.currency || 'CDF');
    }).catch(e=> console.error(e));
  },[id]);

  function handleSubmit(e: React.FormEvent){
    e.preventDefault();
    if(!id) return;
    client.post(`/api/billing/${id}/add_payment/`, { amount, currency }).then(()=>{
      notifier.notify('Paiement enregistré', 'success');
      nav('/billing');
    }).catch((err:any)=> alert('Erreur: '+(err?.message||err)));
  }

  if(!billing) return <div>Chargement…</div>;

  const notifier = useNotifier();

  return (
    <Box sx={{ p:2 }}>
      <Card>
        <CardContent>
          <Typography variant="h6">Règlement facture</Typography>
          <Typography>Patient: {billing.patient_display || billing.patient}</Typography>
          <Typography>Montant facture: {billing.amount} {billing.currency}</Typography>
          <Typography>Restant dû: {billing.remaining_due} {billing.currency}</Typography>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt:2, display:'flex', flexDirection:'column', gap:1 }}>
            <TextField label="Montant payé" type="number" value={amount} onChange={(e)=> setAmount(Number(e.target.value))} />
            <TextField label="Devise" value={currency} onChange={(e)=> setCurrency(e.target.value)} />
            <Button type="submit" variant="contained">Valider</Button>
            <Button variant="text" onClick={()=> nav('/billing')}>Annuler</Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

export default BillingPayment;
