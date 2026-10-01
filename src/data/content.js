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
    a: 'Available methods appear during checkout. The store can accept cash on delivery or enable manual InstaPay and Vodafone Cash transfers. For transfers, pay the displayed destination and enter your transfer reference; the store verifies it manually. Card payments are not available yet.',
  },
  {
    q: 'Can I return a product?',
    a: 'Unopened products can be returned within 14 days of delivery for a full refund. If your order arrived damaged or incorrect, contact us within 48 hours and we will replace it right away.',
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
  { label: 'Phone', value: '+20 155 293 5950', href: 'tel:+201552935950' },
  { label: 'Email', value: 'azstore700@gmail.com', href: 'mailto:azstore700@gmail.com' },
  { label: 'Instagram', value: '@az.store', href: 'https://instagram.com' },
  { label: 'Facebook', value: 'AZ Store', href: 'https://facebook.com' },
  { label: 'TikTok', value: '@az.store', href: 'https://tiktok.com' },
  { label: 'WhatsApp', value: '+20 155 293 5950', href: 'https://wa.me/201552935950' },
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
      { label: 'Track your order', to: '/track-order' },
      { label: 'Shipping & Delivery', to: '/faq' },
      { label: 'Returns & Refunds', to: '/faq' },
      { label: 'FAQ', to: '/faq' },
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


export const ORDER_STEPS = [
  'Order Received',
  'Payment Confirmed',
  'Preparing Order',
  'Out for Delivery',
  'Delivered',
];
