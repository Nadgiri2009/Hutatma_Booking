import React, { useState, useEffect } from 'react';
import {
  Box, Container, Typography, Paper, TextField, Button, Grid,
  Divider, Alert, CircularProgress,
  ImageList, ImageListItem, Dialog,
} from '@mui/material';
import { Search, Print, LocationOn, Phone, Email, Map } from '@mui/icons-material';
import { bookingAPI, galleryAPI } from '../../services/api';
import { toast } from 'react-toastify';
import Receipt from '../../components/Receipt';

// ── PRINT BOOKING DETAILS ─────────────────────────────────────────────────────
export const PrintBookingPage: React.FC = () => {
  const [search, setSearch]       = useState('');
  const [searchType, setSearchType] = useState<'number' | 'mobile'>('number');
  const [results, setResults]     = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);
  const [searched, setSearched]   = useState(false);

  const handleSearch = async () => {
    if (!search.trim()) { toast.warning('Enter booking ID or mobile number'); return; }
    setLoading(true);
    setSearched(true);
    try {
      let data: any[] = [];
      if (searchType === 'number') {
        const r = await bookingAPI.getByNumber(search.trim());
        data = r.data ? [r.data] : [];
      } else {
        const r = await bookingAPI.getByMobile(search.trim());
        data = r.data || [];
      }
      setResults(data);
    } catch { toast.error('No records found'); setResults([]); }
    finally { setLoading(false); }
  };

  return (
    <Box sx={{ bgcolor: '#fbf6fa', minHeight: '100vh', py: 6 }}>
      <Container maxWidth="md">
        <Box textAlign="center" mb={5} sx={{ displayPrint: 'none' }}>
          <Typography variant="h4" fontWeight={700} color="primary.main">Print Booking Details</Typography>
          <Typography variant="body1" color="text.secondary" mt={1}>
            Search your booking using Booking ID or registered Mobile Number
          </Typography>
        </Box>

        <Paper sx={{ p: 4, borderRadius: 2, mb: 4, displayPrint: 'none' }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            {(['number', 'mobile'] as const).map((t) => (
              <Button
                key={t}
                variant={searchType === t ? 'contained' : 'outlined'}
                onClick={() => setSearchType(t)}
                size="small"
              >
                {t === 'number' ? 'Booking ID' : 'Mobile Number'}
              </Button>
            ))}
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              placeholder={searchType === 'number' ? 'e.g. HSM-2024-00001' : 'e.g. 9876543210'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              size="small"
            />
            <Button
              variant="contained" startIcon={<Search />}
              onClick={handleSearch} disabled={loading}
              sx={{ minWidth: 120 }}
            >
              {loading ? <CircularProgress size={18} /> : 'Search'}
            </Button>
          </Box>
        </Paper>

        {searched && results.length === 0 && !loading && (
          <Alert severity="info" sx={{ displayPrint: 'none' }}>No bookings found. Please check your Booking ID or Mobile Number.</Alert>
        )}

        {results.map((b) => (
          <Box key={b.id} sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1, displayPrint: 'none' }}>
              <Button variant="contained" size="small" startIcon={<Print />} onClick={() => window.print()}>
                Print Receipt
              </Button>
            </Box>
            <Receipt booking={b} />
            {b.status === 'Confirmed' && (
              <Alert severity="success" sx={{ mt: 2, maxWidth: 800, mx: 'auto', displayPrint: 'none' }}>
                Your booking is confirmed and your payment has been verified. The receipt above is your official proof of payment.
              </Alert>
            )}
            {b.status === 'PendingPayment' && (
              <Alert severity="warning" sx={{ mt: 2, maxWidth: 800, mx: 'auto', displayPrint: 'none' }}>
                Your booking is Payment Pending. There is no admin approval step — your booking will be confirmed
                automatically as soon as your payment is verified.
              </Alert>
            )}
          </Box>
        ))}
      </Container>
    </Box>
  );
};

// ── ABOUT VENUE PAGE ──────────────────────────────────────────────────────────
export const AboutVenuePage: React.FC = () => (
  <Box>
    <Box sx={{ background: 'linear-gradient(110deg, #b45490 0%, #48145e 100%)', py: 8, textAlign: 'center' }}>
      <Container maxWidth="md">
        <Typography variant="h3" sx={{ color: '#fff', fontWeight: 800 }}>About Hutatma Smruti Mandir</Typography>
        <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.8)', mt: 2, fontWeight: 400 }}>
          A tribute to the freedom fighters — a venue that serves the community with pride
        </Typography>
      </Container>
    </Box>

    <Box sx={{ py: 8, bgcolor: '#fff' }}>
      <Container maxWidth="lg">
        <Grid container spacing={6} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="overline" sx={{ color: '#b45490', fontWeight: 700, letterSpacing: 2 }}>OUR HISTORY</Typography>
            <Typography variant="h4" sx={{ color: '#50175d', mt: 1, mb: 3 }}>A Legacy of Service</Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Hutatma Smruti Mandir was established in honour of the brave freedom fighters (Hutatmas) who sacrificed their lives for the nation.
              The institution has been serving the local community for decades, providing a world-class venue for cultural, social, and corporate events.
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Managed under a public trust, the venue upholds the highest standards of transparency, integrity, and service excellence.
            </Typography>
            {[
              'Established under public trust',
              'Government-recognized institution',
              'Community-focused operations',
              'Transparent booking process',
            ].map((f) => (
                <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#b45490' }} />
                <Typography variant="body2">{f}</Typography>
              </Box>
            ))}
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{
              height: 400, borderRadius: 3, overflow: 'hidden',
              backgroundImage: 'url(https://images.unsplash.com/photo-1541746972996-4e0b0f43e02a?w=800&q=80)',
              backgroundSize: 'cover', backgroundPosition: 'center',
            }} />
          </Grid>
        </Grid>
      </Container>
    </Box>

    <Box sx={{ py: 8, bgcolor: '#fbf6fa' }}>
      <Container maxWidth="lg">
        <Typography variant="h4" sx={{ color: '#50175d', mb: 4, textAlign: 'center', fontWeight: 700 }}>Venue Specifications</Typography>
        <Grid container spacing={3}>
          {[
            { label: 'Main Hall',       capacity: '500 persons', area: '5000 sq.ft', floor: 'Ground Floor' },
            { label: 'Conference Room', capacity: '50 persons',  area: '800 sq.ft',  floor: 'First Floor'  },
            { label: 'VIP Lounge',      capacity: '20 persons',  area: '400 sq.ft',  floor: 'First Floor'  },
          ].map((v) => (
            <Grid item xs={12} md={4} key={v.label}>
              <Paper sx={{ p: 3, borderRadius: 2, borderTop: '4px solid #50175d' }}>
                <Typography variant="h6" fontWeight={700} color="primary.main" gutterBottom>{v.label}</Typography>
                <Divider sx={{ mb: 2 }} />
                {[['Capacity', v.capacity], ['Area', v.area], ['Floor', v.floor]].map(([k, val]) => (
                  <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">{k}</Typography>
                    <Typography variant="body2" fontWeight={600}>{val}</Typography>
                  </Box>
                ))}
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>

    <Box sx={{ py: 8, bgcolor: '#fff' }}>
      <Container maxWidth="lg">
        <Typography variant="h4" sx={{ color: '#50175d', mb: 4, textAlign: 'center', fontWeight: 700 }}>Rules &amp; Regulations</Typography>
        <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 2, borderTop: '4px solid #b45490' }}>
          <Grid container spacing={1.5}>
            {[
              'Booking must be made at least 7 days in advance.',
              'Premises must be vacated by the specified time.',
              'Illegal/anti-social activities are prohibited.',
              'Applicant is responsible for event damages.',
              'Alcohol consumption is strictly prohibited.',
              'Decorations must not damage walls or fixtures.',
              'SMC staff must be allowed inspection access anytime.',
              'Loudspeakers must follow permitted noise limits.',
            ].map((rule) => (
              <Grid item xs={12} md={6} key={rule}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#b45490', mt: 0.9, flexShrink: 0 }} />
                  <Typography variant="body2" color="text.secondary">{rule}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Container>
    </Box>

    <Box sx={{ py: 8, bgcolor: '#fbf6fa' }}>
      <Container maxWidth="lg">
        <Typography variant="h4" sx={{ color: '#50175d', mb: 4, textAlign: 'center', fontWeight: 700 }}>Cancellation &amp; Refund Policy</Typography>
        <Paper sx={{ borderRadius: 2, overflow: 'hidden', maxWidth: 800, mx: 'auto' }}>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
            <Box component="thead">
              <Box component="tr" sx={{ bgcolor: '#50175d' }}>
                <Box component="th" sx={{ color: '#fff', textAlign: 'left', p: 2, fontWeight: 700, fontSize: '0.9rem' }}>
                  Cancellation Time
                </Box>
                <Box component="th" sx={{ color: '#fff', textAlign: 'left', p: 2, fontWeight: 700, fontSize: '0.9rem' }}>
                  Refund
                </Box>
              </Box>
            </Box>
            <Box component="tbody">
              {[
                ['2 months or more before event', '90%'],
                ['1 month before event',          '80%'],
                ['7 days before event',           '50%'],
                ['Less than 7 days',              'Security Deposit Only'],
              ].map(([time, refund], i) => (
                <Box component="tr" key={time} sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                  <Box component="td" sx={{ p: 2, borderBottom: '1px solid #e2e8f0' }}>
                    <Typography variant="body2" color="text.secondary">{time}</Typography>
                  </Box>
                  <Box component="td" sx={{ p: 2, borderBottom: '1px solid #e2e8f0' }}>
                    <Typography variant="body2" fontWeight={700} color="primary.main">{refund}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Paper>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
          Cancellation time is calculated from the original event date. Refunds are processed to the bank account provided at the time of booking.
        </Typography>
      </Container>
    </Box>
  </Box>
);

// ── CONTACT PAGE ──────────────────────────────────────────────────────────────
export const ContactPage: React.FC = () => {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Message sent! We will respond within 24 hours.');
    setSent(true);
  };

  return (
    <Box>
      <Box sx={{ background: 'linear-gradient(110deg, #b45490 0%, #48145e 100%)', py: 8, textAlign: 'center' }}>
        <Container maxWidth="md">
          <Typography variant="h3" sx={{ color: '#fff', fontWeight: 800 }}>Contact Us</Typography>
          <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.8)', mt: 2, fontWeight: 400 }}>
            We're here to help you plan your perfect event
          </Typography>
        </Container>
      </Box>

      <Box sx={{ py: 8, bgcolor: '#fbf6fa' }}>
        <Container maxWidth="lg">
          <Grid container spacing={5}>
            <Grid item xs={12} md={5}>
              <Typography variant="h5" fontWeight={700} color="primary.main" mb={3}>Get in Touch</Typography>
              {[
                { icon: <LocationOn color="primary" />, label: 'Address',  val: 'Hutatma Chowk, Solapur, Maharashtra 413001' },
                { icon: <Phone color="primary" />,      label: 'Phone',    val: '0217-2740308'          },
                { icon: <Email color="primary" />,      label: 'Email',    val: 'booking@hutatmamandir.org'                   },
              ].map((c) => (
                <Box key={c.label} sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'flex-start' }}>
                  <Box sx={{ mt: 0.3 }}>{c.icon}</Box>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700}>{c.label}</Typography>
                    <Typography variant="body2" color="text.secondary">{c.val}</Typography>
                  </Box>
                </Box>
              ))}
              <Box sx={{ bgcolor: '#f4eaf3', p: 2, borderRadius: 2, borderLeft: '4px solid #50175d', mt: 2 }}>
                <Typography variant="body2" fontWeight={600} color="primary.main">Office Hours</Typography>
                <Typography variant="body2" color="text.secondary">Monday – Saturday: 10:00 AM – 6:00 PM</Typography>
                <Typography variant="body2" color="text.secondary">Sunday & Holidays: Closed</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={7}>
              <Paper sx={{ p: 4, borderRadius: 2 }}>
                <Typography variant="h5" fontWeight={700} color="primary.main" mb={3}>Send a Message</Typography>
                {sent ? (
                  <Alert severity="success">Thank you! Your message has been received. We'll get back to you soon.</Alert>
                ) : (
                  <Box component="form" onSubmit={handleSubmit}>
                    <Grid container spacing={2}>
                      {[
                        { key: 'name',    label: 'Your Name *',      md: 6  },
                        { key: 'email',   label: 'Email Address *',  md: 6  },
                        { key: 'subject', label: 'Subject *',        md: 12 },
                      ].map(({ key, label, md }) => (
                        <Grid item xs={12} md={md} key={key}>
                          <TextField
                            label={label} fullWidth size="small"
                            value={(form as any)[key]}
                            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                            required
                          />
                        </Grid>
                      ))}
                      <Grid item xs={12}>
                        <TextField
                          label="Message *" fullWidth multiline rows={5}
                          value={form.message}
                          onChange={(e) => setForm({ ...form, message: e.target.value })}
                          required
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Button type="submit" variant="contained" fullWidth size="large" startIcon={<Email />}>
                          Send Message
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h5" fontWeight={700} color="primary.main" mb={2}>Find Us</Typography>
              <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <Box
                  component="iframe"
                  title="Hutatma Smruti Mandir location map"
                  src="https://www.google.com/maps?q=Hutatma+Chowk,+Solapur,+Maharashtra+413001&output=embed"
                  sx={{ width: '100%', height: 350, border: 0 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </Paper>
              <Button
                component="a"
                href="https://www.google.com/maps/search/?api=1&query=Hutatma+Chowk,+Solapur,+Maharashtra+413001"
                target="_blank"
                rel="noopener noreferrer"
                startIcon={<Map />}
                sx={{ mt: 1.5 }}
              >
                Open in Google Maps
              </Button>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

// ── GALLERY PAGE ──────────────────────────────────────────────────────────────
export const GalleryPage: React.FC = () => {
  const [images, setImages]   = useState<any[]>([]);
  const [videos, setVideos]   = useState<any[]>([]);
  const [tab, setTab]         = useState<'photos' | 'videos'>('photos');
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    galleryAPI.getAll('Photo').then((r) => setImages(r.data)).catch(() => {});
    galleryAPI.getAll('Video').then((r) => setVideos(r.data)).catch(() => {});
  }, []);

  const demoImages = [
    'C:\\Users\\16507\\Pictures\\Screenshots\\Screenshot 2024-06-17 195029.png',
    'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=600&q=80',
    'https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=600&q=80',
    'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=600&q=80',
    'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=600&q=80',
    'https://images.unsplash.com/photo-1531058020387-3be344556be6?w=600&q=80',
  ];

  return (
    <Box>
      <Box sx={{ background: 'linear-gradient(110deg, #b45490 0%, #48145e 100%)', py: 8, textAlign: 'center' }}>
        <Container maxWidth="md">
          <Typography variant="h3" sx={{ color: '#fff', fontWeight: 800 }}>Gallery</Typography>
          <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.8)', mt: 2, fontWeight: 400 }}>
            Take a visual tour of our venue and past events
          </Typography>
        </Container>
      </Box>

      <Box sx={{ py: 6, bgcolor: '#fbf6fa' }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', gap: 2, mb: 4, justifyContent: 'center' }}>
            {(['photos', 'videos'] as const).map((t) => (
              <Button
                key={t}
                variant={tab === t ? 'contained' : 'outlined'}
                onClick={() => setTab(t)}
                sx={{ px: 4 }}
              >
                {t === 'photos' ? '📷 Photos' : '🎥 Videos'}
              </Button>
            ))}
          </Box>

          {tab === 'photos' && (
            <ImageList cols={3} gap={12} sx={{ m: 0 }}>
              {demoImages.map((src, i) => (
                <ImageListItem key={i} sx={{ cursor: 'pointer', borderRadius: 2, overflow: 'hidden' }}
                  onClick={() => setLightbox(src)}>
                  <img
                    src={src}
                    alt={`Gallery ${i + 1}`}
                    loading="lazy"
                    style={{ borderRadius: 8, transition: 'transform 0.3s', objectFit: 'cover', height: 220 }}
                  />
                </ImageListItem>
              ))}
            </ImageList>
          )}

          {tab === 'videos' && (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="body1" color="text.secondary">No videos uploaded yet.</Typography>
            </Box>
          )}
        </Container>
      </Box>

      {/* Lightbox */}
      <Dialog open={!!lightbox} onClose={() => setLightbox(null)} maxWidth="lg">
        <img src={lightbox || ''} alt="Gallery preview" style={{ maxHeight: '85vh', maxWidth: '100%', display: 'block' }} />
      </Dialog>
    </Box>
  );
};
