export default function AetherLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-7 h-7', md: 'w-9 h-9', lg: 'w-14 h-14' };
  return (
    <img
      src="/web/icon-192.png"
      alt="LBT"
      className={`${sizes[size]} rounded-xl object-cover`}
    />
  );
}
