import Image from 'next/image';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import type { SiteContent } from '@/i18n/content/en';
import { brand, radius } from '@/theme/brand';

/** The thing the café is known for, said once, beside the photograph of it. */
export function CanBand({ t }: { t: SiteContent }) {
  return (
    <Box component="section" sx={{ backgroundColor: brand.rosePinkTint }}>
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '5fr 7fr' },
            gap: { xs: 4, md: 8 },
            alignItems: 'center',
          }}
        >
          <Box sx={{ position: 'relative', aspectRatio: '4 / 5', borderRadius: `${radius.xl}px`, overflow: 'hidden' }}>
            <Image
              src="/media/iced-can-hand.webp"
              alt={t.can.alt}
              fill
              sizes="(max-width: 900px) 100vw, 40vw"
              style={{ objectFit: 'cover', objectPosition: 'center 40%' }}
            />
          </Box>
          <Typography
            component="p"
            variant="h2"
            sx={{ fontSize: { xs: 'clamp(2rem, 9vw, 2.75rem)', md: 'clamp(2.75rem, 4.6vw, 4.25rem)' }, maxWidth: '13ch' }}
          >
            {t.can.line}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
