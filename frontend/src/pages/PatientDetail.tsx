import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { isAuthenticated } from '../api/auth';
import client from '../api/client';
import { Box, Typography, Card, CardContent, Button } from '@mui/material';

const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [patient, setPatient] = useState<any | null>(null);

  useEffect(()=>{
    if (!id) return;
    if (!isAuthenticated()) { nav('/login'); return; }
    client.get(`/api/patients/${id}/`).then(r=> setPatient(r.data)).catch(e=> console.error(e));
  },[id]);

  function handleDelete(){
    if(!window.confirm('Supprimer ce patient ?')) return;
    client.delete(`/api/patients/${id}/`).then(()=> nav('/patients')).catch(e=> alert('Erreur: '+(e.message || e)));
  }

  if(!patient) return <div>Chargement…</div>;

  return (
    <Box sx={{ p:2 }}>
      <Typography variant="h4">{patient.last_name} {patient.first_name}</Typography>
      <Card sx={{ mt:2 }}>
        <CardContent>
          <Typography>MRN: {patient.medical_record_number}</Typography>
          <Typography>Naissance: {patient.birth_date}</Typography>
          <Typography>Genre: {patient.gender}</Typography>
          <Typography>Téléphone: {patient.phone}</Typography>
          <Typography>Email: {patient.email}</Typography>
          <Typography>Adresse: {patient.address}</Typography>
          <Typography>Allergies: {patient.allergies}</Typography>
          <Typography>Notes: {patient.notes}</Typography>
          <Box sx={{ mt:2 }}>
            <Button variant="contained" onClick={()=> nav('/patients')}>Retour</Button>
            <Button variant="outlined" color="error" sx={{ ml:2 }} onClick={handleDelete}>Supprimer</Button>
          </Box>
        </CardContent>
      </Card>

      {/* Appointments */}
      <Card sx={{ mt:2 }}>
        <CardContent>
          <Typography variant="h6">Rendez-vous</Typography>
          {patient.appointments && patient.appointments.length ? (
            patient.appointments.map((a: any) => (
              <Box key={a.id} sx={{ my:1, p:1, border: '1px solid #eee', borderRadius:1 }}>
                <Typography>{a.date} {a.time || ''} — {a.staff ? (a.staff.display_name || a.staff) : '—'}</Typography>
                <Typography variant="body2">{a.reason}</Typography>
              </Box>
            ))
          ) : <Typography color="text.secondary">Aucun rendez-vous</Typography>}
        </CardContent>
      </Card>

      {/* Billings */}
      <Card sx={{ mt:2 }}>
        <CardContent>
          <Typography variant="h6">Facturations</Typography>
          {patient.billings && patient.billings.length ? (
            patient.billings.map((b: any) => (
              <Box key={b.id} sx={{ my:1, p:1, border: '1px solid #eee', borderRadius:1 }}>
                <Typography>{b.issued_at} — {b.amount} {b.currency}</Typography>
                <Typography variant="body2">{b.description}</Typography>
                {b.items && b.items.length ? (
                  <Box sx={{ mt:1 }}>
                    {b.items.map((it: any) => (
                      <Typography key={it.id} variant="body2">• {it.acte_display || it.description} — {it.total}</Typography>
                    ))}
                  </Box>
                ) : null}
              </Box>
            ))
          ) : <Typography color="text.secondary">Aucune facturation</Typography>}
        </CardContent>
      </Card>
    </Box>
  );
}

export default PatientDetail;
