import { VariantCarousel } from '../components/VariantCarousel';

export function VariantSelectionScreen() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-4 sm:px-6 sm:py-5">
      <div className="mx-auto flex w-full max-w-[min(100%,38rem)] flex-1 flex-col sm:max-w-[44rem]">
        <VariantCarousel />
      </div>
    </div>
  );
}
