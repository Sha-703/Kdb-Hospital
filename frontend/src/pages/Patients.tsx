import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated } from '../api/auth';
import client from '../api/client';
import { Box, Typography, Card, CardContent, Grid, CircularProgress, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import PatientForm from '../components/PatientForm';

const Patients: React.FC = () => {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const emptyForm = { first_name: '', last_name: '', birth_date: '', gender: '', phone: '', email: '', address: '', allergies: '', notes: '' };
  const [form, setForm] = useState<Record<string, any>>(emptyForm);

  useEffect(() => {
    if (!isAuthenticated()) { nav('/login'); return; }
    client.get('/api/patients/')
      .then(r => setPatients(r.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const nav = useNavigate();

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    client.post('/api/patients/', form)
      .then(r => {
        setPatients([r.data, ...patients]);
        setForm(emptyForm);
      })
      .catch(err => alert('Error creating patient: ' + (err.response?.data || err.message)));
  }

  // after successful creation, clear the form
  // (we reset in the promise chain to ensure server accepted the patient)

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>Patients</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Créer un patient</Typography>
              <PatientForm value={form} onChange={handleChange} onSubmit={handleCreate} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6">Liste</Typography>
              {loading ? <CircularProgress /> : (
                patients.length === 0 ? <Typography>Aucun patient</Typography> : (
                  <Table>
                    <TableHead>
                      <TableRow><TableCell>MRN</TableCell><TableCell>Nom</TableCell></TableRow>
                    </TableHead>
                    <TableBody>
                      {patients.map(p => (
                        <TableRow key={p.id} hover sx={{ cursor: 'pointer' }} onClick={() => nav(`/patients/${p.id}`)}>
                          <TableCell>{p.medical_record_number}</TableCell>
                          <TableCell>{p.last_name} {p.first_name}</TableCell>
                        </TableRow>
                      ))}
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

export default Patients;
