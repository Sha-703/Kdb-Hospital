import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated } from '../api/auth';
import client from '../api/client';
import { Box, Typography, Card, CardContent, TextField, Button, Grid, CircularProgress, Table, TableHead, TableRow, TableCell, TableBody, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Collapse } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const Actes: React.FC = () => {
  const [actes, setActes] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [form, setForm] = useState<Record<string, any>>({ code: '', name: '', amount: 0, currency: 'CDF' });
  const [subOpen, setSubOpen] = useState<boolean>(false);
  const [subForm, setSubForm] = useState<Record<string, any>>({ code: '', name: '', amount: 0, currency: 'CDF', parent: '' });

  // build children map for hierarchical display
  const childrenMap = React.useMemo(() => {
    const m: Record<string, any[]> = {};
    actes.forEach(a => {
      if (a.parent) {
        const k = String(a.parent);
        if (!m[k]) m[k] = [];
        m[k].push(a);
      }
    });
    return m;
  }, [actes]);
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  function toggleExpand(id: string){
    setExpandedMap(prev => ({ ...prev, [id]: !prev[id] }));
  }

  useEffect(()=>{
    if (!isAuthenticated()) { nav('/login'); return; }
    client.get('/api/actes/')
      .then(r=> setActes(r.data))
      .catch(e=> console.error(e))
      .finally(()=> setLoading(false));
  },[]);

  const nav = useNavigate();

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>){
    const { name, value } = e.target as HTMLInputElement;
    setForm({...form, [name]: value});
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    client.post('/api/actes/', form)
      .then(r=> setActes([r.data, ...actes]))
      .catch(err=> alert('Erreur: ' + (err.response?.data || err.message)));
  }

  function handleSubChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>){
    const { name, value } = e.target as HTMLInputElement;
    setSubForm({...subForm, [name]: value});
  }

  function handleSubCreate(e?: React.FormEvent<HTMLFormElement>){
    if (e) e.preventDefault();
    client.post('/api/actes/', subForm)
      .then(r=> {
        setActes([r.data, ...actes]);
        setSubOpen(false);
      })
      .catch(err=> alert('Erreur création sous-acte: ' + (err.response?.data || err.message)));
  }

  return (
    <>
    <Box sx={{ p:2 }}>
      <Typography variant="h4" gutterBottom>Actes</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Créer un acte</Typography>
              <Box component="form" onSubmit={handleCreate} sx={{ display:'flex', flexDirection:'column', gap:1, mt:1 }}>
                <TextField name="code" label="Code" value={form.code} onChange={handleChange} />
                <TextField name="name" label="Nom" value={form.name} onChange={handleChange} />
                {/* Montant calculé automatiquement depuis les sous-actes; pas de saisie ici */}
                <Button type="submit" variant="contained">Créer</Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6">Liste des actes</Typography>
              {loading ? <CircularProgress /> : (
                actes.length === 0 ? <Typography>Aucun acte</Typography> : (
                  <Table>
                    <TableHead>
                          <TableRow><TableCell>Code</TableCell><TableCell>Nom</TableCell><TableCell>Montant (CDF)</TableCell></TableRow>
                        </TableHead>
                    <TableBody>
                            {actes
                              .filter(a => !a.parent)
                              .map(parent => (
                                  <React.Fragment key={parent.id}>
                                    <TableRow>
                                      <TableCell>
                                        { (childrenMap[String(parent.id)] || []).length > 0 ? (
                                          <IconButton size="small" onClick={() => toggleExpand(String(parent.id))} sx={{ transform: expandedMap[String(parent.id)] ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                            <ExpandMoreIcon />
                                          </IconButton>
                                        ) : null}
                                        <strong style={{ marginLeft: 8 }}>{parent.code}</strong>
                                      </TableCell>
                                      <TableCell>
                                        <strong>{parent.name}</strong>
                                        <div>
                                          <Button size="small" onClick={() => {
                                            setSubForm({ code: '', name: '', amount: 0, currency: parent.currency || 'CDF', parent: parent.id });
                                            setSubOpen(true);
                                          }}>Ajouter sous-acte</Button>
                                        </div>
                                      </TableCell>
                                      <TableCell><strong>{Number(parent.amount || 0).toLocaleString('fr-FR', {minimumFractionDigits:2, maximumFractionDigits:2})} CDF</strong></TableCell>
                                    </TableRow>

                                    <TableRow>
                                      <TableCell style={{ padding: 0, border: 0 }} colSpan={3}>
                                        <Collapse in={expandedMap[String(parent.id)]} timeout="auto" unmountOnExit>
                                          <Box sx={{ margin: 1 }}>
                                            <Table size="small">
                                              <TableBody>
                                                {(childrenMap[String(parent.id)] || []).map((child:any) => (
                                                  <TableRow key={child.id}>
                                                    <TableCell style={{ paddingLeft: 32 }}>{child.code}</TableCell>
                                                    <TableCell style={{ paddingLeft: 32 }}>{child.name}</TableCell>
                                                    <TableCell>{Number(child.amount || 0).toLocaleString('fr-FR', {minimumFractionDigits:2, maximumFractionDigits:2})} CDF</TableCell>
                                                  </TableRow>
                                                ))}
                                              </TableBody>
                                            </Table>
                                          </Box>
                                        </Collapse>
                                      </TableCell>
                                    </TableRow>
                                  </React.Fragment>
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
    <Dialog open={subOpen} onClose={()=> setSubOpen(false)}>
      <DialogTitle>Créer un sous-acte</DialogTitle>
      <DialogContent>
        <Box component="form" id="sub-acte-form" onSubmit={(e)=> { e.preventDefault(); handleSubCreate(); }} sx={{ display:'flex', flexDirection:'column', gap:1, mt:1 }}>
          <TextField name="code" label="Code" value={subForm.code} onChange={handleSubChange} />
          <TextField name="name" label="Nom" value={subForm.name} onChange={handleSubChange} />
          <TextField name="amount" label="Montant (CDF)" type="number" value={subForm.amount} onChange={handleSubChange} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={()=> setSubOpen(false)}>Annuler</Button>
        <Button type="submit" form="sub-acte-form" variant="contained">Créer</Button>
      </DialogActions>
    </Dialog>
    </>
  );
}

export default Actes;
