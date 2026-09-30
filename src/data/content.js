export const ANNOUNCEMENT = 'Free gift cards with every trio box';

export const NAV_LINKS = [
  { label: 'Shop all', to: '/shop' },
  { label: 'Scents', to: '/shop?filter=mists' },
  { label: 'Gift sets', to: '/shop?filter=gift-sets' },
  { label: 'Our story', to: '/about' },
];

export const TRUST_ITEMS = [
  'Long-lasting, morning to night',
  'Skin-safe formula',
  'Gift-ready packaging',
  'Delivery across Egypt',
];

export const FILTER_CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'mists', label: 'Mists' },
  { id: 'serums', label: 'Serums' },
  { id: 'gift-sets', label: 'Gift sets' },
  { id: 'calm-and-deep', label: 'Calm and deep' },
  { id: 'bold', label: 'Bold' },
  { id: 'soft', label: 'Soft' },
];

export const SORT_OPTIONS = [
  { id: 'featured', label: 'Featured' },
  { id: 'newest', label: 'Newest' },
  { id: 'price-asc', label: 'Price: Low to High' },
  { id: 'price-desc', label: 'Price: High to Low' },
  { id: 'best-rated', label: 'Best Rated' },
  { id: 'best-selling', label: 'Best Selling' },
];

export const SCENT_PROFILES = ['Calm and deep', 'Bold', 'Soft and dreamy'];

export const GOVERNORATES = [
  'Cairo', 'Giza', 'Alexandria', 'Qalyubia', 'Dakahlia', 'Sharqia', 'Gharbia',
  'Monufia', 'Beheira', 'Kafr El Sheikh', 'Damietta', 'Port Said', 'Ismailia',
  'Suez', 'Matrouh', 'Fayoum', 'Beni Suef', 'Minya', 'Assiut', 'Sohag', 'Qena',
  'Luxor', 'Aswan', 'Red Sea', 'New Valley', 'North Sinai', 'South Sinai',
];

export const FAQS = [
  {
    q: 'How long does delivery take?',
    a: 'Standard delivery takes 2 to 4 working days anywhere in Egypt. Express delivery arrives the next working day for Cairo and Giza, and within 2 days for most other governorates.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'Cash on delivery, Visa and Mastercard, Vodafone Cash and InstaPay. Card payments are processed by our PCI-compliant payment partner — we never see or store your card details.',
  },
  {
    q: 'Can I return a product?',
    a: 'Unopened products can be returned within 14 days of delivery for a full refund. If your order arrived damaged or incorrect, contact us within 48 hours and we will replace it right away.',
  },
  {
    q: 'How can I track my order?',
    a: 'Use the Track order page with your order number (for example AZ-2609-1001) and the phone number you checked out with. You will see every step from order received to delivered.',
  },
  {
    q: 'Are your products authentic?',
    a: 'Yes. Every AZ mist is formulated and filled under our own supervision in small, dated batches. Each bottle carries a batch code you can verify with our customer care team.',
  },
  {
    q: 'Do you deliver across Egypt?',
    a: 'We deliver to all 27 governorates. Standard delivery is EGP 60 and express is EGP 110. Orders over EGP 1,800 ship free with standard delivery.',
  },
];

export const CONTACT_INFO = [
  { label: 'Phone', value: '+20 100 000 0000', href: 'tel:+201000000000' },
  { label: 'Email', value: 'care@az-store.eg', href: 'mailto:care@az-store.eg' },
  { label: 'Instagram', value: '@az.store', href: 'https://instagram.com' },
  { label: 'Facebook', value: 'AZ Store', href: 'https://facebook.com' },
  { label: 'TikTok', value: '@az.store', href: 'https://tiktok.com' },
  { label: 'WhatsApp', value: '+20 100 000 0000', href: 'https://wa.me/201000000000' },
];

export const FOOTER_COLUMNS = [
  {
    title: 'Shop',
    links: [
      { label: 'Shop all', to: '/shop' },
      { label: 'Scents', to: '/shop?filter=mists' },
      { label: 'Gift sets', to: '/shop?filter=gift-sets' },
      { label: 'Best sellers', to: '/shop?sort=best-selling' },
      { label: 'New arrivals', to: '/shop?sort=newest' },
    ],
  },
  {
    title: 'Customer Service',
    links: [
      { label: 'Contact', to: '/contact' },
      { label: 'Shipping & Delivery', to: '/faq' },
      { label: 'Returns & Refunds', to: '/faq' },
      { label: 'FAQ', to: '/faq' },
      { label: 'Track order', to: '/track-order' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Our story', to: '/about' },
      { label: 'Privacy Policy', to: '/privacy' },
      { label: 'Terms & Conditions', to: '/terms' },
    ],
  },
];

export const VODAFONE_CASH_NUMBER = '[YOUR VODAFONE CASH NUMBER]';
export const INSTAPAY_ACCOUNT = '[YOUR INSTAPAY ACCOUNT]';

export const ORDER_STEPS = [
  'Order Received',
  'Payment Confirmed',
  'Preparing Order',
  'Out for Delivery',
  'Delivered',
];
