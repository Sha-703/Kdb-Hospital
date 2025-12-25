import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated } from '../api/auth';
import client from '../api/client';
import { Box, Typography, Grid, Card, CardContent, CircularProgress } from '@mui/material';
import BillingForm from '../components/BillingForm';
import DataList from '../components/DataList';

const Billing: React.FC = () => {
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totals, setTotals] = useState<any[]>([]);

  useEffect(()=>{
    if (!isAuthenticated()) { nav('/login'); return; }
    client.get('/api/billing/').then(r=> setBills(r.data)).catch(e=> console.error(e));
    client.get('/api/billing/totals/').then(r=> setTotals(r.data)).catch(e=> console.error(e)).finally(()=> setLoading(false));
  },[]);

  const nav = useNavigate();

  function handleCreate(data: Record<string, any>){
    client.post('/api/billing/', data).then(r=> setBills([r.data, ...bills])).catch(err=> alert('Erreur: '+(err?.message||err)));
  }

  const columns = [
    {
      field: 'patient_display',
      title: 'Patient',
      render: (r:any) => (
        <a style={{ cursor: 'pointer', color: '#1976d2' }} onClick={() => nav(`/patients/${r.patient}`)}>{r.patient_display || r.patient}</a>
      ),
    },
    { field: 'description', title: 'Description' },
    {
      field: 'actes',
      title: 'Acte(s)',
      render: (r:any) => (r.items ? (r.items.map((it:any)=> it.acte_display || it.description).join(', ')) : ''),
    },
    { field: 'amount', title: 'Montant', render: (r:any) => {
      const total = Number(r.amount || 0);
      const remaining = Number((typeof r.remaining_due !== 'undefined' ? r.remaining_due : (r.amount - (r.paid_total || 0))) || 0);
      const paid = Number((r.paid_total !== undefined ? r.paid_total : (total - remaining)) || 0);
      const text = `${total.toLocaleString('fr-FR',{minimumFractionDigits:2, maximumFractionDigits:2})} ${r.currency}`;
      if (remaining > 0) {
        return (
          <div>
            <a style={{ cursor: 'pointer', color: '#1976d2' }} onClick={() => nav(`/billing/${r.id}/pay`)}>{text}</a>
            <div style={{ fontSize: '0.85em', color: '#444' }}>Restant: {remaining.toLocaleString('fr-FR',{minimumFractionDigits:2, maximumFractionDigits:2})} {r.currency} — Payé: {paid.toLocaleString('fr-FR',{minimumFractionDigits:2, maximumFractionDigits:2})} {r.currency}</div>
          </div>
        );
      }
      return (<div style={{ color: '#666' }}>{text} <span style={{ fontSize: '0.85em', marginLeft: 8 }}>(Réglée)</span></div>);
    } },
    { field: 'actions', title: 'Actions', render: (r:any) => (
      <>
        <button onClick={async ()=>{
          if(!window.confirm('Supprimer cette facture ?')) return;
          try{
            await client.delete(`/api/billing/${r.id}/`);
            // remove from list
            setBills(s => s.filter(b => b.id !== r.id));
          }catch(e:any){ alert('Erreur suppression: '+(e?.message||e)); }
        }}>Supprimer</button>
      </>
    ) },
  ];

  return (
    <Box sx={{ p:2 }}>
      <Typography variant="h4">Facturation</Typography>
      <Grid container spacing={2} sx={{ mt:1 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Créer une facture</Typography>
              <BillingForm onSubmit={handleCreate} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6">Liste</Typography>
                {loading ? <CircularProgress /> : (
                  <>
                    <Box sx={{ mb:1 }}>
                      {totals.map((t:any)=>(
                        <Typography key={t.currency} variant="body2">Total {t.currency}: {Number(t.total||0).toLocaleString('fr-FR',{minimumFractionDigits:2, maximumFractionDigits:2})} — Payé: {Number(t.paid||0).toLocaleString('fr-FR',{minimumFractionDigits:2, maximumFractionDigits:2})} — Non réglé: {Number(t.unpaid||0).toLocaleString('fr-FR',{minimumFractionDigits:2, maximumFractionDigits:2})}</Typography>
                      ))}
                    </Box>
                    <DataList columns={columns} rows={bills} />
                  </>
                )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Billing;
