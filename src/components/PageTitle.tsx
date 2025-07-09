import React from "react";

interface PageTitleProps {
  children: React.ReactNode;
  className?: string;
}

const PageTitle: React.FC<PageTitleProps> = ({ children, className = "" }) => (
  <h1 className={`text-3xl font-bold mb-8 border-b border-gray-200 pb-3 ${className}`}>{children}</h1>
);

export default PageTitle; 