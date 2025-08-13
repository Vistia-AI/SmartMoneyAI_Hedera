import LayoutWrapper from "./layout/layout-wrapper";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <LayoutWrapper>
      {children}
    </LayoutWrapper>
  );
}
