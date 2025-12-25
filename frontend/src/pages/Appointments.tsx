import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated } from '../api/auth';
import client from '../api/client';
import { Box, Typography, Card, CardContent, TextField, Button, Grid, CircularProgress, Table, TableHead, TableRow, TableCell, TableBody, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useNotifier } from '../contexts/Notifier';

const Appointments: React.FC = () => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [form, setForm] = useState<Record<string, any>>({ patient: '', date: '', reason: '' });
  const [patients, setPatients] = useState<any[]>([]);
  const notifier = useNotifier();

  function formatDateTime(value: string | null | undefined) {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  const STATUS_LABELS: Record<string, string> = {
    scheduled: 'Planifié',
    checked_in: 'Enregistré',
    completed: 'Terminé',
    cancelled: 'Annulé',
  };

  async function changeStatus(id: string, newStatus: string) {
    try {
      const res = await client.patch(`/api/appointments/${id}/`, { status: newStatus });
      setAppointments(prev => prev.map(a => a.id === id ? res.data : a));
      notifier.notify('Statut mis à jour', 'success');
    } catch (e: any) {
      notifier.notify('Erreur mise à jour statut: ' + (e?.response?.data || e?.message || e), 'error');
    }
  }

  useEffect(()=>{
    if (!isAuthenticated()) { nav('/login'); return; }
    // load appointments and patients concurrently
    setLoading(true);
    Promise.all([client.get('/api/appointments/'), client.get('/api/patients/')])
      .then(([a, p])=>{
        setAppointments(a.data || []);
        setPatients(p.data || []);
      })
      .catch(e=> console.error(e))
      .finally(()=> setLoading(false));
  },[]);

  const nav = useNavigate();

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>){
    setForm({...form, [e.target.name]: e.target.value});
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    const payload: Record<string, any> = { ...form };
    // convert datetime-local (local time) to ISO string so backend receives an ISO datetime
    if (payload.date) {
      try {
        const dt = new Date(payload.date);
        if (!isNaN(dt.getTime())) payload.date = dt.toISOString();
      } catch (e) {
        // leave as-is on error
      }
    }
    client.post('/api/appointments/', payload)
      .then(r=> {
        setAppointments([r.data, ...appointments]);
        notifier.notify('Rendez-vous créé', 'success');
      })
      .catch(err=> notifier.notify('Erreur création: ' + (err.response?.data || err.message), 'error'));
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>Rendez-vous</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Créer rendez-vous</Typography>
              <Box component="form" onSubmit={handleCreate} sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt:1 }}>
                <FormControl fullWidth>
                  <InputLabel id="patient-select-label">Patient</InputLabel>
                  <Select
                    labelId="patient-select-label"
                    name="patient"
                    value={form.patient}
                    label="Patient"
                    onChange={(e) => setForm({...form, patient: e.target.value})}
                  >
                    <MenuItem value=""><em>Sélectionner</em></MenuItem>
                    {patients.map(p => (
                      <MenuItem key={p.id} value={p.id}>{(p.last_name || '') + ' ' + (p.first_name || '')}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField name="date" label="Date et heure" type="datetime-local" value={form.date} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                <TextField name="reason" label="Motif" value={form.reason} onChange={handleChange} />
                <Button type="submit" variant="contained">Créer</Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6">Liste</Typography>
              {loading ? <CircularProgress /> : (
                appointments.length === 0 ? <Typography>Aucun rendez-vous</Typography> : (
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Motif</TableCell>
                        <TableCell>Patient</TableCell>
                        <TableCell>Date & heure</TableCell>
                        <TableCell>Statut</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {appointments.map(a => {
                        const pat = patients.find((p: any) => p.id === a.patient) || null;
                        const patientName = pat ? `${pat.last_name || ''} ${pat.first_name || ''}`.trim() : (a.patient_display || a.patient || '');
                        return (
                          <TableRow key={a.id}>
                            <TableCell>{a.reason || '-'}</TableCell>
                            <TableCell>{patientName}</TableCell>
                            <TableCell>{formatDateTime(a.date)}</TableCell>
                            <TableCell>
                                  <FormControl fullWidth size="small">
                                    <Select value={a.status || ''} onChange={(e)=> changeStatus(a.id, e.target.value as string)}>
                                      <MenuItem value="scheduled">{STATUS_LABELS['scheduled']}</MenuItem>
                                      <MenuItem value="checked_in">{STATUS_LABELS['checked_in']}</MenuItem>
                                      <MenuItem value="completed">{STATUS_LABELS['completed']}</MenuItem>
                                      <MenuItem value="cancelled">{STATUS_LABELS['cancelled']}</MenuItem>
                                    </Select>
                                  </FormControl>
                                  <div style={{ fontSize: '0.85em', color: '#666', marginTop: 4 }}>{STATUS_LABELS[a.status] || a.status}</div>
                                </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Appointments;
