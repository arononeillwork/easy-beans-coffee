'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Typography from '@mui/material/Typography';
import { ALLERGEN_IDS, type AllergenId } from '@/i18n/allergens';
import { useLanguage } from '@/i18n/LanguageProvider';
import { loadAllergies, saveAllergies } from '@/shared/lib/allergyPrefs';
import { brand, radius, shadow } from '@/theme/brand';

/**
 * The allergies preference on the account page: a dropdown over the same five
 * allergens as the counter sign (see i18n/allergens), chosen once and kept.
 *
 * Deliberately stored on the device rather than in the Square profile.
 * Allergy data is the most sensitive thing a customer could tell this site,
 * and a reminder chip does not need it on a server — and this way the
 * preference also works before anyone signs in. Safety itself stays human:
 * the note below the control says to tell the counter, every time.
 */
export function AllergiesCard() {
  const { t } = useLanguage();
  const labels = t.account;
  const [chosen, setChosen] = useState<AllergenId[]>([]);

  // localStorage does not exist on the server; read it after mount.
  useEffect(() => {
    setChosen(loadAllergies());
  }, []);

  const change = (ids: AllergenId[]) => {
    setChosen(ids);
    saveAllergies(ids);
  };

  return (
    <Box
      sx={{
        backgroundColor: brand.white,
        borderRadius: `${radius.xl}px`,
        boxShadow: shadow.soft,
        p: { xs: 3, md: 4 },
      }}
    >
      <Typography variant="h4" component="h2" sx={{ mb: 1 }}>
        {labels.allergies}
      </Typography>
      <Typography sx={{ color: brand.ink70, mb: 2.5 }}>{labels.allergiesBody}</Typography>

      <FormControl fullWidth size="small">
        <InputLabel id="allergy-select-label">{labels.allergiesLabel}</InputLabel>
        <Select
          labelId="allergy-select-label"
          multiple
          value={chosen}
          label={labels.allergiesLabel}
          onChange={(event) => change(event.target.value as AllergenId[])}
          renderValue={(ids) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {ids.map((id) => (
                <Chip key={id} label={t.allergens.labels[id]} size="small" />
              ))}
            </Box>
          )}
        >
          {ALLERGEN_IDS.map((id) => (
            <MenuItem key={id} value={id}>
              <Checkbox size="small" checked={chosen.includes(id)} />
              <ListItemText primary={t.allergens.labels[id]} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Typography sx={{ mt: 1.5, fontSize: '0.8125rem', color: brand.ink45 }}>
        {labels.allergiesNote}
      </Typography>
    </Box>
  );
}
