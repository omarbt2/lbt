import logo from '../assets/logo.png';

export default function LbtLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  // تحديد المقاسات بناءً على أبعاد الشعار لتفادي أي قص
  const sizes = { 
    sm: 'w-8 h-8', 
    md: 'w-12 h-12', 
    lg: 'w-24 h-24' 
  };

  return (
    <img
      src={logo}
      alt="LBT Logo"
      className={`${sizes[size]} object-contain`}
    />
  );
}