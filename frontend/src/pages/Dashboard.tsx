import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated } from '../api/auth';
import { Grid, Card, CardContent, Typography, CircularProgress, Box, List, ListItem, ListItemText } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { getCurrentUser } from '../api/auth';
import { ROLE_LABELS } from '../constants/roles';
import client from '../api/client';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658'];

const Dashboard: React.FC = () => {
  const [counts, setCounts] = useState<{patients:number, appointments:number}>({ patients: 0, appointments: 0 });
  const [loading, setLoading] = useState<boolean>(true);
  const [appointmentsData, setAppointmentsData] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [billingTotals, setBillingTotals] = useState<{ paid: number; unpaid: number; total: number; currency?: string }>({ paid: 0, unpaid: 0, total: 0, currency: 'EUR' });
  const nav = useNavigate();
  const user = getCurrentUser();
  const rawRole = user?.role || user?.roles || '';
  const userRole = ROLE_LABELS[rawRole] || rawRole || '—';
  const hospitalName = user?.hospital || user?.tenant_name || localStorage.getItem('tenant_slug') || '—';

  useEffect(()=>{
    if (!isAuthenticated()) { nav('/login'); return; }
    const p = client.get('/api/patients/').then(r=> r.data.length).catch(()=>0);
    const a = client.get('/api/appointments/').then(r=> r.data).catch(()=>[]);
    const b = client.get('/api/billing/totals/').then(r=> r.data).catch(()=>[]);
    Promise.all([p,a,b]).then(([pl, al, bt])=>{
      setCounts({ patients: pl, appointments: al.length });
      const sample = (al || []).slice(0,20).map((it:any, idx:number)=>({ name: `A${idx+1}`, value: idx % 5 + 1 }));
      setAppointmentsData(sample.length ? sample : [ {name:'S1', value:5}, {name:'S2', value:7}, {name:'S3', value:4} ]);
      setEvents((al || []).slice(0,6).map((a:any)=>({ id: a.id, title: a.reason || 'Rendez-vous', when: a.start_time })));

      // billing totals per currency
      const totals = bt || [];
      // pick CDF and USD
      const cdf = totals.find((t:any)=> t.currency === 'CDF') || { paid:0, unpaid:0, total:0 };
      const usd = totals.find((t:any)=> t.currency === 'USD') || { paid:0, unpaid:0, total:0 };
      // store as object in billingTotals: use currency field to show primary (CDF)
      setBillingTotals({ paid: cdf.paid, unpaid: cdf.unpaid, total: cdf.total, currency: 'CDF' });
      // optionally store totals for both in localStorage for cashier page
      localStorage.setItem('billing_totals_cdf', JSON.stringify(cdf));
      localStorage.setItem('billing_totals_usd', JSON.stringify(usd));
    }).finally(()=> setLoading(false));
  },[]);

  function formatMoney(value: number){
    try{
      return value.toLocaleString('fr-FR', {minimumFractionDigits:2, maximumFractionDigits:2});
    }catch(e){
      return (Number(value) || 0).toFixed(2);
    }
  }

  const pieData = [
    { name: 'Patients', value: counts.patients },
    { name: 'Appointments', value: counts.appointments },
    { name: 'Available', value: Math.max(0, 100 - counts.appointments) }
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>Tableau de bord — {hospitalName} ({userRole})</Typography>
      {loading ? <CircularProgress /> : (
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2">Patients</Typography>
                <Typography variant="h5">{counts.patients}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2">Rendez-vous</Typography>
                <Typography variant="h5">{counts.appointments}</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2">Solde de la caisse</Typography>
                <Typography variant="h5">CDF {formatMoney(JSON.parse(localStorage.getItem('billing_totals_cdf')||'{"paid":0}').paid || 0)}</Typography>
                <Typography variant="caption" color="text.secondary">Total factures réglées (CDF)</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2">Caisse (CDF)</Typography>
                    <Typography variant="h6">Total: CDF {formatMoney(JSON.parse(localStorage.getItem('billing_totals_cdf')||'{"total":0}').total || 0)}</Typography>
                    <Typography variant="body2">Payé: CDF {formatMoney(JSON.parse(localStorage.getItem('billing_totals_cdf')||'{"paid":0}').paid || 0)}</Typography>
                    <Typography variant="body2">Non réglé: CDF {formatMoney(JSON.parse(localStorage.getItem('billing_totals_cdf')||'{"unpaid":0}').unpaid || 0)}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2">Caisse (USD)</Typography>
                    <Typography variant="h6">Total: USD {formatMoney(JSON.parse(localStorage.getItem('billing_totals_usd')||'{"total":0}').total || 0)}</Typography>
                    <Typography variant="body2">Payé: USD {formatMoney(JSON.parse(localStorage.getItem('billing_totals_usd')||'{"paid":0}').paid || 0)}</Typography>
                    <Typography variant="body2">Non réglé: USD {formatMoney(JSON.parse(localStorage.getItem('billing_totals_usd')||'{"unpaid":0}').unpaid || 0)}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2">Activité</Typography>
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={40}>
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6">Tendance rendez-vous</Typography>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={appointmentsData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6">Factures: payé vs non réglé</Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={[{name:'Payé', value: billingTotals.paid}, {name:'Non réglé', value: billingTotals.unpaid}]} dataKey="value" nameKey="name" outerRadius={60} label>
                      {[
                        { name: 'Payé' },
                        { name: 'Non réglé' }
                      ].map((entry, index) => (
                        <Cell key={`cell-b-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2">Total factures: {billingTotals.currency} {billingTotals.total?.toFixed(2)}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6">Événements à venir</Typography>
                <List>
                  {events.length === 0 && <ListItem><ListItemText primary="Aucun événement"/></ListItem>}
                  {events.map(ev => (
                    <ListItem key={ev.id}><ListItemText primary={ev.title} secondary={ev.when} /></ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}

export default Dashboard;
