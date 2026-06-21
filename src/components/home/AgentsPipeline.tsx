"use client";
import { useState, useEffect } from "react";
import {
  FolderGit2,
  KeyRound,
  ShieldAlert,
  Bug,
  Target,
  Wrench,
} from "lucide-react";
const agents = [
  {
    id: "context",
    name: "Repository Context Agent",
    icon: FolderGit2,
    description:
      "Maps the entire project structure, technology stack, and business logic to understand the application as a holistic system.",
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-600",
  },
  {
    id: "secret",
    name: "Secret Leakage Agent",
    icon: KeyRound,
    description:
      "Deep scans repositories for exposed API keys, passwords, tokens, certificates, and hardcoded credentials.",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
  },
  {
    id: "dependency",
    name: "Dependency Risk Agent",
    icon: ShieldAlert,
    description:
      "Analyzes dependency trees for vulnerable packages, outdated libraries, and supply chain threats.",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  {
    id: "owasp",
    name: "OWASP Agent",
    icon: Bug,
    description:
      "Detects OWASP Top 10 vulnerabilities including SQL Injection, XSS, SSRF, and broken access control issues.",
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
  },
  {
    id: "impact",
    name: "Attack Impact Agent",
    icon: Target,
    description:
      "Evaluates exploitability and business impact to prioritize security risks based on severity.",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
  },
  {
    id: "fix",
    name: "Fix Generator Agent",
    icon: Wrench,
    description:
      "Generates secure code fixes, remediation guidance, and implementation-ready recommendations.",
    iconBg: "bg-cyan-100",
    iconColor: "text-cyan-600",
  },
];
export default function AgentsPipeline() {
  const [activeTab, setActiveTab] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTab((prev) => (prev + 1) % agents.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);
  const ActiveIcon = agents[activeTab].icon;
  return (
    <section className="bg-[#F6F7FC] py-24 px-6">
      {" "}
      <div className="max-w-7xl mx-auto">
        {" "}
        {/* Header */}{" "}
        <div className="text-center mb-16">
          {" "}
          <div className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-5 py-2 text-sm font-medium text-indigo-600 mb-6">
            {" "}
            AGENTIC SECURITY WORKFLOW{" "}
          </div>{" "}
          <h2 className="text-4xl md:text-6xl font-black text-slate-900">
            {" "}
            Multi-Agent <span className="text-indigo-600">Pipeline</span>{" "}
          </h2>{" "}
          <p className="max-w-3xl mx-auto mt-6 text-lg text-slate-600">
            {" "}
            Our intelligent AI workflow processes your repository through
            specialized security agents that identify vulnerabilities, assess
            impact, and generate remediation strategies.{" "}
          </p>{" "}
        </div>{" "}
        {/* Main Layout */}{" "}
        <div className="grid lg:grid-cols-[340px_1fr] gap-8">
          {" "}
          {/* Sidebar */}{" "}
          <div className="space-y-4">
            {" "}
            {agents.map((agent, idx) => {
              const Icon = agent.icon;
              const isActive = activeTab === idx;
              return (
                <button
                  key={agent.id}
                  onClick={() => setActiveTab(idx)}
                  className={`w-full text-left transition-all duration-300 rounded-2xl border p-4 ${isActive ? "bg-indigo-50 border-indigo-300 shadow-sm" : "bg-white border-slate-200 hover:border-indigo-200 hover:shadow-sm"}`}
                >
                  {" "}
                  <div className="flex items-center gap-4">
                    {" "}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isActive ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}
                    >
                      {" "}
                      {idx + 1}{" "}
                    </div>{" "}
                    <div className={`p-3 rounded-xl ${agent.iconBg}`}>
                      {" "}
                      <Icon className={`w-5 h-5 ${agent.iconColor}`} />{" "}
                    </div>{" "}
                    <div>
                      {" "}
                      <h3
                        className={`font-semibold ${isActive ? "text-indigo-700" : "text-slate-800"}`}
                      >
                        {" "}
                        {agent.name}{" "}
                      </h3>{" "}
                    </div>{" "}
                  </div>{" "}
                </button>
              );
            })}{" "}
          </div>{" "}
          {/* Content Card */}{" "}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-8 md:p-12">
            {" "}
            <div className="flex flex-col h-full justify-center">
              {" "}
              <div
                className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-8 ${agents[activeTab].iconBg}`}
              >
                {" "}
                <ActiveIcon
                  className={`w-10 h-10 ${agents[activeTab].iconColor}`}
                />{" "}
              </div>{" "}
              <div className="text-sm font-semibold uppercase tracking-wider text-indigo-600 mb-3">
                {" "}
                Step {activeTab + 1} of {agents.length}{" "}
              </div>{" "}
              <h3 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">
                {" "}
                {agents[activeTab].name}{" "}
              </h3>{" "}
              <p className="text-lg text-slate-600 leading-relaxed max-w-3xl">
                {" "}
                {agents[activeTab].description}{" "}
              </p>{" "}
              {/* Progress */}{" "}
              <div className="mt-10">
                {" "}
                <div className="flex justify-between text-sm text-slate-500 mb-2">
                  {" "}
                  <span>Pipeline Progress</span>{" "}
                  <span>
                    {" "}
                    {Math.round(((activeTab + 1) / agents.length) * 100)} %{" "}
                  </span>{" "}
                </div>{" "}
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  {" "}
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                    style={{
                      width: `${((activeTab + 1) / agents.length) * 100}%`,
                    }}
                  />{" "}
                </div>{" "}
              </div>{" "}
              {/* Stats */}{" "}
              <div className="grid md:grid-cols-3 gap-4 mt-10">
                {" "}
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                  {" "}
                  <div className="text-sm text-slate-500">
                    {" "}
                    Scan Coverage{" "}
                  </div>{" "}
                  <div className="text-2xl font-bold text-slate-900 mt-1">
                    {" "}
                    100%{" "}
                  </div>{" "}
                </div>{" "}
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                  {" "}
                  <div className="text-sm text-slate-500"> AI Agents </div>{" "}
                  <div className="text-2xl font-bold text-slate-900 mt-1">
                    {" "}
                    6{" "}
                  </div>{" "}
                </div>{" "}
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                  {" "}
                  <div className="text-sm text-slate-500">
                    {" "}
                    Auto Fixes{" "}
                  </div>{" "}
                  <div className="text-2xl font-bold text-slate-900 mt-1">
                    {" "}
                    Ready{" "}
                  </div>{" "}
                </div>{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
        {/* Bottom Flow */}{" "}
        <div className="mt-16 bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
          {" "}
          <div className="flex flex-wrap justify-center gap-4">
            {" "}
            {agents.map((agent, idx) => (
              <div key={agent.id} className="flex items-center gap-4">
                {" "}
                <div className="px-4 py-3 rounded-xl bg-indigo-50 text-indigo-700 font-medium">
                  {" "}
                  {agent.name}{" "}
                </div>{" "}
                {idx < agents.length - 1 && (
                  <div className="w-8 h-[2px] bg-indigo-200" />
                )}{" "}
              </div>
            ))}{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </section>
  );
}
