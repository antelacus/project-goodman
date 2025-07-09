import React from "react";

interface PageContainerProps {
  children: React.ReactNode;
  maxWidth?: "3xl" | "4xl" | "5xl" | "6xl" | "7xl";
  className?: string;
}

const maxWidthMap = {
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
};

const PageContainer: React.FC<PageContainerProps> = ({ children, maxWidth = "3xl", className = "" }) => {
  return (
    <div className={`min-h-screen bg-white text-black`}> 
      <div className={`${maxWidthMap[maxWidth]} mx-auto px-4 sm:px-6 lg:px-8 pt-6 ${className}`}>
        {children}
      </div>
    </div>
  );
};

export default PageContainer; 