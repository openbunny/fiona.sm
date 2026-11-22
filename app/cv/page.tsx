// cspell:ignore ocaml modeling chronext symfony connectrpc laudert vreden shopware oxid ahaus limassol duckdb microvm grapheneos bocholt münster
import type { Metadata } from "next"
import type { ReactElement, ReactNode } from "react"

import { CvViewer } from "@/components/cv-viewer"
import { SiteBar } from "@/components/site-bar"
import { SiteFooter } from "@/components/site-footer"
import {
  publicRecruitmentRobots,
  routeSocialMetadata,
} from "@/lib/site/metadata"
import { PageShell } from "@openbunny/react"

const title = "principal software engineer cv"
const description =
  "principal software engineer with eight years of production experience in go, rust, aws and kubernetes. explore platform engineering, security, and quantitative trading work."

export const metadata: Metadata = {
  title,
  description,
  robots: publicRecruitmentRobots,
  keywords: [
    "principal software engineer",
    "platform engineering",
    "distributed systems",
    "go",
    "rust",
    "kubernetes",
    "aws",
    "security engineering",
    "quantitative trading",
  ],
  alternates: { canonical: "/cv" },
  ...routeSocialMetadata({
    title,
    description,
    path: "/cv",
    type: "website",
  }),
}

function Section({
  id,
  title,
  children,
}: {
  readonly id: string
  readonly title: string
  readonly children: ReactNode
}): ReactElement {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="border-t border-line pt-5 first:border-t-0 first:pt-0"
    >
      <h2 id={`${id}-heading`} className="mb-5 font-display text-xl">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Role({
  title,
  period,
  children,
}: {
  readonly title: string
  readonly period: string
  readonly children: ReactNode
}): ReactElement {
  return (
    <div className="mt-5 first:mt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h4 className="font-display font-bold">{title}</h4>
        <span className="font-mono text-xs text-muted">{period}</span>
      </div>
      <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed">
        {children}
      </ul>
    </div>
  )
}

function Entry({
  title,
  meta,
  period,
  children,
}: {
  readonly title: string
  readonly meta: string
  readonly period: string
  readonly children: ReactNode
}): ReactElement {
  return (
    <div className="mt-8 first:mt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="font-display text-lg font-bold">{title}</h3>
        <span className="font-mono text-xs text-muted">{period}</span>
      </div>
      <p className="mb-3 text-sm text-muted">{meta}</p>
      {children}
    </div>
  )
}

export default function CvPage(): ReactElement {
  return (
    <PageShell>
      <SiteBar route="/cv" />
      <main id="main" className="mt-8">
        <header className="border-b border-line pb-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mb-2 font-mono text-xs text-muted">
                curriculum vitae
              </p>
              <h1 className="font-display text-[clamp(2rem,9vw,3.25rem)] leading-tight">
                fiona
              </h1>
              <p className="mt-2 text-lg">principal software engineer</p>
            </div>
            <a
              className="link inline-flex border border-line px-3 py-2 font-mono text-xs no-underline hover:underline"
              href="/cv.pdf"
              download="fiona-cv.pdf"
            >
              download pdf ↓
            </a>
          </div>
          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 font-mono text-xs">
            <a className="link" href="mailto:mail@fiona.sm">
              mail@fiona.sm
            </a>
            <a className="link" href="tel:+46727729346">
              +46 72-772 93 46
            </a>
            <a className="link" href="https://www.linkedin.com/in/fionapesch/">
              linkedin
            </a>
          </div>
        </header>

        <div className="mt-8 flex flex-col gap-10">
          <Section id="about" title="about">
            <p className="leading-relaxed">
              eight years building and operating production systems. most
              recently principal software engineer at a listed german e-commerce
              group, working on kubernetes platform services, acquisition due
              diligence and integration, and an erp rewrite led as product
              owner. outside work, i build quantitative trading systems and
              security-first agent infrastructure.
            </p>
            <p className="mt-4 font-mono text-xs leading-relaxed text-muted">
              go · rust · ocaml · typescript · aws · kubernetes · docker ·
              terraform · nix · github actions · grpc · postgresql · rabbitmq ·
              trading systems · risk management · threat modeling
            </p>
          </Section>

          <Section id="experience" title="experience">
            <Entry
              title="the platform group ag"
              meta="remote, germany"
              period="apr 2023 – oct 2026"
            >
              <Role
                title="principal software engineer"
                period="feb 2025 – oct 2026"
              >
                <li>
                  technical due diligence on acquisitions with the ceo and cfo,
                  followed by integration or replacement of acquired platforms
                </li>
                <li>
                  architecture and operation of go and rust grpc services on aws
                  and kubernetes, with postgresql, mysql, mongodb, redis, and
                  rabbitmq; infrastructure as code across aws, azure, and
                  github; ci/cd, observability, and on-call
                </li>
                <li>
                  for acquired subsidiary chronext, moved gitlab to github at
                  approximately 86% lower cost per seat; introduced git lfs for
                  approximately 80% faster clones and pulls and 37.5% faster
                  docker builds
                </li>
                <li>
                  security assessments of partner api integrations and
                  bot-mitigation vendors; mentoring for approximately 15
                  developers
                </li>
              </Role>
              <Role
                title="software engineer & product owner"
                period="mar 2024 – feb 2025"
              >
                <li>
                  product owner of the group erp rewrite with approximately 10
                  developers, responsible for technical architecture and
                  technology planning
                </li>
                <li>
                  established go and rust as service languages and wrote go and
                  symfony service templates
                </li>
                <li>
                  built connectrpc services for document generation,
                  authentication, authorization, and data transformation and
                  transfer
                </li>
              </Role>
              <Role title="software engineer" period="apr 2023 – mar 2024">
                <li>
                  maintained integrations keeping millions of records
                  synchronized across more than 50 marketplaces, shops,
                  carriers, erp and pim systems, using php, go, rust, rest,
                  soap, file transfer, and rabbitmq
                </li>
                <li>
                  migrated engineering workflows from azure devops to github,
                  jira, and confluence
                </li>
              </Role>
            </Entry>

            <Entry
              title="laudert gmbh + co. kg"
              meta="vreden, germany"
              period="oct 2019 – apr 2023"
            >
              <Role title="software developer" period="oct 2019 – apr 2023">
                <li>
                  built shopware, oxid, and symfony e-commerce applications with
                  typescript, vue, react, next.js, docker, and ci/cd
                </li>
                <li>
                  trained apprentices in development, architecture, and devops
                </li>
              </Role>
            </Entry>

            <Entry
              title="s.he business gmbh"
              meta="ahaus, germany · full-time until sep 2019, then part-time"
              period="apr 2018 – sep 2025"
            >
              <Role
                title="software engineer & systems administrator"
                period="apr 2018 – sep 2025"
              >
                <li>
                  developed a healthcare mobile application with a go backend
                  using aws lambda, api gateway, and ecs fargate, with a react
                  native frontend
                </li>
                <li>
                  developed shopware plugins and webshops; administered nas and
                  telephone systems
                </li>
              </Role>
            </Entry>
          </Section>

          <Section id="projects" title="projects">
            <Entry
              title="quantitative trading systems"
              meta="family & friends · limassol, cyprus"
              period="mar 2022 – present"
            >
              <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
                <li>
                  live perpetual-futures funding-rate arbitrage between
                  decentralized exchanges, executed by an ocaml engine with
                  exact arithmetic, write-ahead order journal, crash recovery,
                  and liquidation guards
                </li>
                <li>
                  rust market-data infrastructure covering approximately 100
                  crypto, macroeconomic, and regulatory sources, plus a
                  funding-rate arbitrage scanner
                </li>
                <li>
                  leakage-safe strategy evaluation using day-partitioned
                  parquet, duckdb, and purged time-series folds with embargo
                </li>
                <li>
                  contract-first grpc services for execution, pricing, and risk
                  management
                </li>
              </ul>
            </Entry>
            <Entry
              title="agent & security infrastructure"
              meta="independent projects"
              period="2025 – present"
            >
              <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
                <li>
                  microvm sandbox for autonomous coding agents without host
                  access; verified egress policies, gateway-held credentials,
                  and offline verification of returned commits
                </li>
                <li>
                  nix-declared agent harness with deterministic task routing,
                  crash-safe coordination, and a headless mac studio agent
                  server
                </li>
                <li>
                  declarative grapheneos hardening with a go controller, kotlin
                  device-owner app, signed policies, and threat modeling;
                  nix-declared macos workstation hardening
                </li>
              </ul>
            </Entry>
          </Section>

          <Section id="education" title="education">
            <Entry
              title="computer science – software systems"
              meta="westphalian university of applied sciences · bocholt, germany · bachelor's coursework, degree not completed"
              period="aug 2019 – jan 2024"
            >
              <p className="text-sm leading-relaxed">
                top grade (1.0 on the german scale) in cloud programming, mobile
                applications, internet applications, and software engineering;
                coursework in kubernetes, helm, and aws eks.
              </p>
            </Entry>
            <Entry
              title="it specialist – application development"
              meta="chamber of industry and commerce · münster, germany"
              period="aug 2019 – jun 2021"
            >
              <p className="text-sm leading-relaxed">
                final project: symfony middleware integrating fuel-card services
                from several vendors.
              </p>
            </Entry>
            <Entry
              title="electrical & electronics engineering diploma"
              meta="occupational college for technology · ahaus, germany"
              period="jul 2017 – jun 2019"
            >
              {null}
            </Entry>
          </Section>

          <section
            className="border-t border-line pt-5"
            aria-labelledby="pdf-heading"
          >
            <h2 id="pdf-heading" className="font-display text-xl">
              pdf version
            </h2>
            <p className="mt-2 text-sm leading-relaxed">
              prefer a printable copy?{" "}
              <a className="link" href="/cv.pdf" download="fiona-cv.pdf">
                download the cv as a pdf
              </a>
              .
            </p>
            <details className="mt-4">
              <summary className="cursor-pointer font-mono text-xs text-muted">
                preview the original pdf
              </summary>
              <div className="mt-3">
                <CvViewer />
              </div>
            </details>
          </section>
        </div>
      </main>
      <SiteFooter />
    </PageShell>
  )
}
