"use client";
import React from "react";
import PageContainer from "../../components/PageContainer";
import PageTitle from "../../components/PageTitle";

export default function ShowcasePage() {
  return (
    <PageContainer maxWidth="6xl">
      <div className="flex flex-col gap-8">
        <section className="w-full">
          <PageTitle>展示案例</PageTitle>
          <p className="text-gray-700 mb-6">本页面将集中展示各功能模块的典型案例，便于演示和说明产品能力。</p>
          {/* 各功能模块案例展示区，内容后续补充 */}
        </section>
      </div>
    </PageContainer>
  );
} 