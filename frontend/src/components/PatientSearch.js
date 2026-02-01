import React, { useState, useEffect } from 'react';
import {
  TextField,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  Typography,
  CircularProgress,
  InputAdornment,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import { Search, Clear } from '@mui/icons-material';
import patientService from '../services/patientService';

const PatientSearch = ({ onSelectPatient, label = "Buscar paciente..." }) => {
  const [query, setQuery] = useState('');
  const [tipoBusqueda, setTipoBusqueda] = useState('todos');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.length >= 2) {
        performSearch();
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query, tipoBusqueda]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const result = await patientService.searchPatients(
        query, 
        tipoBusqueda === 'todos' ? undefined : tipoBusqueda
      );
      setResults(result.data || []);
      setShowResults(true);
    } catch (error) {
      console.error('Error en búsqueda:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (patient) => {
    onSelectPatient(patient);
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
        <FormControl sx={{ minWidth: 120 }} size="small">
          <InputLabel>Tipo búsqueda</InputLabel>
          <Select
            value={tipoBusqueda}
            label="Tipo búsqueda"
            onChange={(e) => setTipoBusqueda(e.target.value)}
          >
            <MenuItem value="todos">Todos</MenuItem>
            <MenuItem value="rut">RUT Chileno</MenuItem>
            <MenuItem value="pasaporte">Pasaporte</MenuItem>
          </Select>
        </FormControl>
        
        <TextField
          fullWidth
          label={label}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowResults(true)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                {loading && <CircularProgress size={20} />}
                {query && (
                  <IconButton onClick={clearSearch} size="small">
                    <Clear />
                  </IconButton>
                )}
                <IconButton onClick={performSearch} size="small">
                  <Search />
                </IconButton>
              </InputAdornment>
            )
          }}
        />
      </Box>

      {showResults && results.length > 0 && (
        <Paper 
          sx={{
            position: 'absolute',
            zIndex: 1000,
            width: '100%',
            maxHeight: 300,
            overflow: 'auto',
            mt: 0.5
          }}
          elevation={3}
        >
          <List dense>
            {results.map((patient) => (
              <ListItem
                key={patient.id}
                button
                onClick={() => handleSelect(patient)}
                sx={{
                  '&:hover': { backgroundColor: 'action.hover' }
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body1">
                        {patient.nombreCompleto}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {patient.tipoIdentificacion === 'rut' 
                          ? patientService.formatRUT(patient.rut)
                          : patient.pasaporte}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                      {patient.telefono && (
                        <Typography variant="caption">
                          📞 {patient.telefono}
                        </Typography>
                      )}
                      {patient.correo && (
                        <Typography variant="caption">
                          ✉️ {patient.correo}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {showResults && query.length >= 2 && results.length === 0 && !loading && (
        <Paper sx={{ p: 2, mt: 0.5 }}>
          <Typography color="text.secondary" align="center">
            No se encontraron pacientes
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default PatientSearch;