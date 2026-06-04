--
-- PostgreSQL database dump
--

-- Dumped from database version 17.1
-- Dumped by pg_dump version 17.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: ExportFormat; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ExportFormat" AS ENUM (
    'PDF',
    'CSV'
);


ALTER TYPE public."ExportFormat" OWNER TO postgres;

--
-- Name: ExtinguisherSize; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ExtinguisherSize" AS ENUM (
    'SIZE_2_5_LB',
    'SIZE_5_LB',
    'SIZE_9_LB',
    'SIZE_12_LB'
);


ALTER TYPE public."ExtinguisherSize" OWNER TO postgres;

--
-- Name: ExtinguisherStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ExtinguisherStatus" AS ENUM (
    'ACTIVE',
    'UNDER_MAINTENANCE',
    'EXPIRED'
);


ALTER TYPE public."ExtinguisherStatus" OWNER TO postgres;

--
-- Name: ExtinguisherType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ExtinguisherType" AS ENUM (
    'WATER',
    'CO2',
    'FOAM',
    'DRY_CHEMICAL'
);


ALTER TYPE public."ExtinguisherType" OWNER TO postgres;

--
-- Name: InspectionStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."InspectionStatus" AS ENUM (
    'PENDING',
    'COMPLETED',
    'OVERDUE'
);


ALTER TYPE public."InspectionStatus" OWNER TO postgres;

--
-- Name: NotificationStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."NotificationStatus" AS ENUM (
    'SENT',
    'RESPONDED',
    'IGNORED',
    'ESCALATED'
);


ALTER TYPE public."NotificationStatus" OWNER TO postgres;

--
-- Name: OtpPurpose; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."OtpPurpose" AS ENUM (
    'REGISTRATION',
    'PASSWORD_RESET'
);


ALTER TYPE public."OtpPurpose" OWNER TO postgres;

--
-- Name: ReportType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ReportType" AS ENUM (
    'INVENTORY',
    'INSPECTION',
    'COMPLIANCE',
    'MAINTENANCE'
);


ALTER TYPE public."ReportType" OWNER TO postgres;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Role" AS ENUM (
    'ADMIN',
    'INSPECTOR',
    'USER'
);


ALTER TYPE public."Role" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    "userId" text,
    action text NOT NULL,
    entity text NOT NULL,
    "entityId" text,
    metadata jsonb,
    "ipAddress" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AuditLog" OWNER TO postgres;

--
-- Name: FireExtinguisher; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."FireExtinguisher" (
    id text NOT NULL,
    code text NOT NULL,
    "serialNumber" text,
    location text,
    type text NOT NULL,
    "extinguisherType" public."ExtinguisherType",
    size text,
    "extinguisherSize" public."ExtinguisherSize",
    "installationDate" timestamp(3) without time zone,
    "expiryDate" timestamp(3) without time zone NOT NULL,
    status public."ExtinguisherStatus" DEFAULT 'ACTIVE'::public."ExtinguisherStatus" NOT NULL,
    "userId" text,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."FireExtinguisher" OWNER TO postgres;

--
-- Name: InspectionResult; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."InspectionResult" (
    id text NOT NULL,
    "scheduleId" text NOT NULL,
    "extinguisherId" text NOT NULL,
    "completedById" text NOT NULL,
    "completedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status public."InspectionStatus" DEFAULT 'COMPLETED'::public."InspectionStatus" NOT NULL,
    "pressureOk" boolean DEFAULT true NOT NULL,
    "pinIntact" boolean DEFAULT true NOT NULL,
    "labelReadable" boolean DEFAULT true NOT NULL,
    "issuesFound" text,
    recommendations text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."InspectionResult" OWNER TO postgres;

--
-- Name: InspectionSchedule; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."InspectionSchedule" (
    id text NOT NULL,
    "extinguisherId" text NOT NULL,
    "inspectorId" text,
    "createdById" text,
    "scheduledDate" timestamp(3) without time zone NOT NULL,
    status public."InspectionStatus" DEFAULT 'PENDING'::public."InspectionStatus" NOT NULL,
    notes text,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."InspectionSchedule" OWNER TO postgres;

--
-- Name: MaintenanceLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."MaintenanceLog" (
    id text NOT NULL,
    "extinguisherId" text NOT NULL,
    "createdById" text,
    "actionTaken" text NOT NULL,
    "maintenanceDate" timestamp(3) without time zone NOT NULL,
    "issuesIdentified" text,
    notes text,
    recommendations text,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."MaintenanceLog" OWNER TO postgres;

--
-- Name: Notification; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Notification" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "extinguisherId" text,
    message text NOT NULL,
    status public."NotificationStatus" DEFAULT 'SENT'::public."NotificationStatus" NOT NULL,
    "sentAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "respondedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Notification" OWNER TO postgres;

--
-- Name: Otp; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Otp" (
    id text NOT NULL,
    email text NOT NULL,
    code text NOT NULL,
    purpose public."OtpPurpose" NOT NULL,
    "userId" text,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "consumedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Otp" OWNER TO postgres;

--
-- Name: RefreshToken; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."RefreshToken" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "tokenHash" text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "revokedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."RefreshToken" OWNER TO postgres;

--
-- Name: Report; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Report" (
    id text NOT NULL,
    type public."ReportType" NOT NULL,
    title text NOT NULL,
    payload jsonb NOT NULL,
    "generatedById" text,
    "exportFormat" public."ExportFormat",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Report" OWNER TO postgres;

--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id text NOT NULL,
    "firstName" text,
    "lastName" text,
    name text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    role public."Role" DEFAULT 'USER'::public."Role" NOT NULL,
    "isVerified" boolean DEFAULT false NOT NULL,
    otp text,
    "otpExpiresAt" timestamp(3) without time zone,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id text NOT NULL,
    name public."Role" NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AuditLog" (id, "userId", action, entity, "entityId", metadata, "ipAddress", "createdAt") FROM stdin;
\.


--
-- Data for Name: FireExtinguisher; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."FireExtinguisher" (id, code, "serialNumber", location, type, "extinguisherType", size, "extinguisherSize", "installationDate", "expiryDate", status, "userId", "deletedAt", "createdAt", "updatedAt") FROM stdin;
7440dc03-1abd-467b-b80f-a45f6ee2a85f	S02	S02	Miami	Water	\N	2.5 lb	\N	2026-06-03 00:00:00	2026-06-16 00:00:00	ACTIVE	\N	2026-06-03 09:43:09.091	2026-06-03 09:42:54.444	2026-06-03 09:43:09.092
4f46139c-999d-4e6b-906a-2fce5533c70e	S01	S01	Ruhango	Water	\N	12 lb	\N	2026-06-02 00:00:00	2026-07-18 00:00:00	ACTIVE	57475927-959f-4f01-ac65-815103eb5981	\N	2026-06-03 09:59:04.08	2026-06-03 10:11:03.729
\.


--
-- Data for Name: InspectionResult; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."InspectionResult" (id, "scheduleId", "extinguisherId", "completedById", "completedAt", status, "pressureOk", "pinIntact", "labelReadable", "issuesFound", recommendations, "createdAt", "updatedAt") FROM stdin;
f6316286-668f-453f-b4ee-abe464bd94d8	d32e764f-7547-4ae2-873f-c0d54f98746a	4f46139c-999d-4e6b-906a-2fce5533c70e	2636928e-9ac1-4d59-853f-c6ce30fcee28	2026-06-03 10:35:33.168	COMPLETED	f	f	t	Leakage	Replace it	2026-06-03 10:35:33.168	2026-06-03 10:35:33.168
\.


--
-- Data for Name: InspectionSchedule; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."InspectionSchedule" (id, "extinguisherId", "inspectorId", "createdById", "scheduledDate", status, notes, "deletedAt", "createdAt", "updatedAt") FROM stdin;
0d07cc4b-c820-42df-915f-3866588ba897	4f46139c-999d-4e6b-906a-2fce5533c70e	2636928e-9ac1-4d59-853f-c6ce30fcee28	57475927-959f-4f01-ac65-815103eb5981	2026-06-18 00:00:00	PENDING	leakge	\N	2026-06-03 10:32:26.434	2026-06-03 10:34:07.25
d32e764f-7547-4ae2-873f-c0d54f98746a	4f46139c-999d-4e6b-906a-2fce5533c70e	2636928e-9ac1-4d59-853f-c6ce30fcee28	ddab961a-7715-4527-b44f-50d581b982a7	2026-06-13 00:00:00	COMPLETED	leakge	\N	2026-06-03 10:33:57.385	2026-06-03 10:35:33.177
81dc974d-d8f1-41f2-9b0b-9cce1ac5e7da	4f46139c-999d-4e6b-906a-2fce5533c70e	\N	57475927-959f-4f01-ac65-815103eb5981	2026-06-03 00:00:00	PENDING	I wanted to you to come and check my fire extinguishers it has been leaking	\N	2026-06-03 11:51:23.334	2026-06-03 11:51:23.334
\.


--
-- Data for Name: MaintenanceLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."MaintenanceLog" (id, "extinguisherId", "createdById", "actionTaken", "maintenanceDate", "issuesIdentified", notes, recommendations, "deletedAt", "createdAt", "updatedAt") FROM stdin;
687f25b6-2b21-4586-9dda-927089971247	4f46139c-999d-4e6b-906a-2fce5533c70e	2636928e-9ac1-4d59-853f-c6ce30fcee28	Replacing	2026-06-04 00:00:00	Leakage		Relace	\N	2026-06-03 10:36:35.487	2026-06-03 10:36:35.487
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Notification" (id, "userId", "extinguisherId", message, status, "sentAt", "respondedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Otp; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Otp" (id, email, code, purpose, "userId", "expiresAt", "consumedAt", "createdAt") FROM stdin;
08679619-88a4-4276-9fe3-fcfec0a8d8e2	qishimwe0@gmail.com	$2b$12$SjQf8ybkZXXgxRklkU6WG.9KcPcsqp3o.9/osJNbIPsmGel5pVPXa	REGISTRATION	2636928e-9ac1-4d59-853f-c6ce30fcee28	2026-06-03 09:30:11.976	2026-06-03 09:21:20.553	2026-06-03 09:20:11.977
9cddd961-d95b-4c53-b4b8-a390965ba01a	hopendindabahizi@gmail.com	$2b$12$EdgPm.Mw441eKQNsqqXHvOSHY1pKt9j8tw78B2zFDf5gSOY/WJM3S	REGISTRATION	57475927-959f-4f01-ac65-815103eb5981	2026-06-03 09:42:50.956	2026-06-03 09:34:04.439	2026-06-03 09:32:50.957
8e741777-e25f-40a7-9410-148819152d38	qishimwe0@gmail.com	$2b$12$3cbsUq0bZ3YxfmzaVc0uQuEnWFV2VVct20BUNrTIe6vZRLf9alN.2	PASSWORD_RESET	2636928e-9ac1-4d59-853f-c6ce30fcee28	2026-06-03 11:01:10.554	2026-06-03 10:51:41.544	2026-06-03 10:51:10.555
8f0b4e8c-210f-4396-a768-e59d21777ddb	hopendindabahizi@gmail.com	$2b$12$0JqEhixcYSMGM/FGJIOu1el4LtymJ2rxh/gp3MpYBZNiothB6i/OO	REGISTRATION	57475927-959f-4f01-ac65-815103eb5981	2026-06-03 11:43:21.581	\N	2026-06-03 11:33:21.584
37f62193-5fe3-44e6-b89f-213e05699408	hopendindabahizi@gmail.com	$2b$12$0.KcQksqXfCy2aJCaP8YHeqfLp1XbAt.2DBMrPvFHffYOT5SISwYy	REGISTRATION	57475927-959f-4f01-ac65-815103eb5981	2026-06-03 11:44:47.019	\N	2026-06-03 11:34:47.021
1790cfb6-dc39-4ab9-bdd9-c38c2d6c82af	hopendindabahizi@gmail.com	$2b$12$Cg/gM.uAHHIrXnP1ICl7E.R9p.er19W778byO3RsNvw1pDUD4c45.	REGISTRATION	57475927-959f-4f01-ac65-815103eb5981	2026-06-03 11:47:53.405	\N	2026-06-03 11:37:53.406
4bc385f5-da11-42b3-95c7-e2ac39cf6e0a	hopendindabahizi@gmail.com	$2b$12$ltFYXhFlNhfKvGGzzZY4Ge/4GSC4/ucqOfKgWehjpeY/N/sYx8lDW	REGISTRATION	57475927-959f-4f01-ac65-815103eb5981	2026-06-03 11:48:46.032	\N	2026-06-03 11:38:46.033
80f69f35-97b8-4244-9884-622d50087727	hopendindabahizi@gmail.com	$2b$12$hb4arN.hGwSu5bZCWfm3yOq1Q8SJyTYZWYMR9pkmgjQC6CramM.B6	REGISTRATION	57475927-959f-4f01-ac65-815103eb5981	2026-06-03 11:52:02.109	2026-06-03 11:42:21.884	2026-06-03 11:42:02.111
b702604b-e6aa-4d2f-a09c-c16727ebafa9	princesseishimwejolie@gmail.com	$2b$12$jMOqoyxbSUi4NR0bjfKzOer5Q7F1wLiQoekuwUGRmRm.J7AkeviMu	REGISTRATION	c011c710-8535-4922-adaa-5a13c18ac934	2026-06-03 11:53:00.032	\N	2026-06-03 11:43:00.034
d9b21cb2-de34-4aa4-a74e-89d97b427834	princesseishimwejolie@gmail.com	$2b$12$YyfjyeKhf7OPwjMlAX3rM.e2SVcv1g9hxV58J1h1Z9SBTVpDnkJi2	REGISTRATION	c011c710-8535-4922-adaa-5a13c18ac934	2026-06-03 11:54:40.318	\N	2026-06-03 11:44:40.321
b79508ef-b25b-423e-ba50-ae660dee034d	uwimanaeva204@gmail.com	$2b$12$aP82Yh4uUXnLabJ19LMBrO8DoHkBI2PMnL/zMlQfrfM7ERKIoLSxS	REGISTRATION	84ca50aa-0546-43ba-b36a-39dc94a06b37	2026-06-03 11:55:34.29	\N	2026-06-03 11:45:34.292
6b7391c4-9e4c-4ef9-8000-43c318df341f	hopendindabahizi@gmail.com	$2b$12$taN4PQ7RUDC84kjxz/v3CO0670CTig/AGw.2LwN87fexDR2fBF93G	REGISTRATION	57475927-959f-4f01-ac65-815103eb5981	2026-06-03 11:56:07.385	2026-06-03 11:47:03.377	2026-06-03 11:46:07.387
4e37457f-9275-4512-8178-6dbfc74ac285	hopendindabahizi@gmail.com	$2b$12$vXtWKuv79ba6/nSOA/035ekskVZ57kTeCyW8xhCmaEZOaJyT/YW9m	REGISTRATION	57475927-959f-4f01-ac65-815103eb5981	2026-06-03 12:00:18.708	2026-06-03 11:50:39.912	2026-06-03 11:50:18.71
\.


--
-- Data for Name: RefreshToken; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."RefreshToken" (id, "userId", "tokenHash", "expiresAt", "revokedAt", "createdAt") FROM stdin;
4a3ad232-9684-410b-9017-4be2c4c6b750	ddab961a-7715-4527-b44f-50d581b982a7	797de6c26cc3f3d5b75e22dc0123969ee9bed761605a33785a4aaa6613212e14	2026-06-10 09:17:58	2026-06-03 09:19:47.935	2026-06-03 09:17:58.878
325cc67e-c57b-454d-bdcf-28da18ad5a02	2636928e-9ac1-4d59-853f-c6ce30fcee28	a07ef32825f49068ac258afbb62a8b79ba2e64442dcb19f712161bf682d1deff	2026-06-10 09:21:20	2026-06-03 09:22:03.767	2026-06-03 09:21:20.57
dd0af238-da6b-4ea3-8c94-898eb00f5b63	ddab961a-7715-4527-b44f-50d581b982a7	e9403f8a49127a6980aa4cae0a88c2064fc7d648762fa65f5914723f4c71e75b	2026-06-10 09:22:19	2026-06-03 09:25:13.214	2026-06-03 09:22:19.997
75b422ea-38a0-41a1-a635-06be4d67448c	57475927-959f-4f01-ac65-815103eb5981	0387223ca7d394efc74757fffea707c5672164fe81d55a154ed5452b22b1ed6c	2026-06-10 09:34:04	\N	2026-06-03 09:34:04.454
adc1c500-ea96-4e66-838d-b118d37e1d43	57475927-959f-4f01-ac65-815103eb5981	25933873a14149e1c6e7f7d01d016888403da0a9eadba16fbc7315b911362642	2026-06-10 09:37:43	2026-06-03 09:41:21.286	2026-06-03 09:37:43.188
696da212-c74c-4146-9154-b9bea722b8a4	ddab961a-7715-4527-b44f-50d581b982a7	e1a9a0589ab14c602c18366fd86062dfe4e669b08becf0ce51671ddf8ca25d6f	2026-06-10 09:55:14	2026-06-03 09:59:29.951	2026-06-03 09:55:14.608
efa1f3ef-d1a5-45aa-96d0-91c36bf75087	ddab961a-7715-4527-b44f-50d581b982a7	4946c0ad984fd5f5e0c1f0d4b28a60cf3ec9c0e013687a0a3e8063305c30ec0e	2026-06-10 09:41:48	2026-06-03 10:07:39.906	2026-06-03 09:41:48.883
25bc72f7-b244-4271-83b1-93b4de95c756	ddab961a-7715-4527-b44f-50d581b982a7	911d9820c07941a797f83170715fc8368798dd36f559e1f954fe9be281e41275	2026-06-10 10:07:39	\N	2026-06-03 10:07:39.923
c85d5255-4c23-4a79-923b-6756f95fbb67	57475927-959f-4f01-ac65-815103eb5981	a993434163dcbd37227accb66c45ba003840d92022abd6ef5d61b4d08275780c	2026-06-10 10:07:53	2026-06-03 10:11:58.493	2026-06-03 10:07:53.495
5787b38d-eddf-494b-9dff-c57733a20541	2636928e-9ac1-4d59-853f-c6ce30fcee28	61834d524bf40a1766d69c47065043355eb9a3262389196a02ae5cf451602053	2026-06-10 10:12:14	2026-06-03 10:14:20.575	2026-06-03 10:12:14.471
e8661148-6dd0-4bc5-93e2-6924f7982b9a	57475927-959f-4f01-ac65-815103eb5981	8c5555c0720d9acc1cc68d35568797f79cc65b6d9fbed1b737e9e3bdc5f337e0	2026-06-10 10:32:11	2026-06-03 10:33:07.358	2026-06-03 10:32:11.042
329f57e2-be70-4b22-9a21-005be88195f0	ddab961a-7715-4527-b44f-50d581b982a7	3edb3f2b6d2e523213271d0797aac620ec285983e893506b662373bb03f77dd0	2026-06-10 10:33:37	2026-06-03 10:34:33.3	2026-06-03 10:33:37.427
94c643c9-e5be-45db-ad73-6ef2dc995416	2636928e-9ac1-4d59-853f-c6ce30fcee28	45f2bcd1b78ff409649a989eaa0303eff2920a73fc62fc61a6225ad5f4f4fba5	2026-06-10 10:34:50	2026-06-03 10:37:14.08	2026-06-03 10:34:50.278
ca840e98-13af-42df-9f70-e7004f918b9b	2636928e-9ac1-4d59-853f-c6ce30fcee28	cbcf7f607653f4323c560ca15cd49d558b28e76ac7530ba93b9bedc7e088920c	2026-06-10 09:25:24	2026-06-03 10:51:41.927	2026-06-03 09:25:24.883
adca4fcd-cab0-474c-951c-41123410362d	57475927-959f-4f01-ac65-815103eb5981	842dd5f404a06350228d23adffecd232a43b4fb840ee509b076b1931e7dc7255	2026-06-10 10:37:58	\N	2026-06-03 10:37:58.987
8fff7487-d38c-4b1b-8320-2c654fc56aa8	57475927-959f-4f01-ac65-815103eb5981	7796e3fa9342da02274666cce66a8e4545202c457ee1a065f4a967602f0c6c12	2026-06-10 10:21:41	2026-06-03 10:37:58.979	2026-06-03 10:21:41.009
743d58d2-8703-424b-baf0-4a88225df1d6	57475927-959f-4f01-ac65-815103eb5981	fdb6aadf7e35d63d7d4a733d6eb469a76fcf6b1c9c47f5269f3d97637df8e1cf	2026-06-10 10:00:35	2026-06-03 10:38:16.533	2026-06-03 10:00:35.994
fa93b6fb-e535-41c3-96b8-6e52fe242ec5	57475927-959f-4f01-ac65-815103eb5981	cac3752d8d2ce9ccc754c0b9e20dbb945f99cd89a2737ca8ec82c6bf5a8bfbf3	2026-06-10 10:38:16	\N	2026-06-03 10:38:16.539
b26ca244-113b-4989-877b-63e8cfa261fe	ddab961a-7715-4527-b44f-50d581b982a7	5df9ad8edec0adc3441a4085bcf0ecc110494b1d74fc97296f16c7cf76dece0b	2026-06-10 10:37:31	2026-06-03 10:41:25.181	2026-06-03 10:37:32
39ed4244-b8b4-435e-8f42-89cf9fee3341	57475927-959f-4f01-ac65-815103eb5981	cfec6601389edf3b6a1644c50de88785451363ff4d75cf630c680bf63b13ca26	2026-06-10 10:41:27	2026-06-03 10:47:14.676	2026-06-03 10:41:27.995
17157cad-7809-43b3-823f-3117aa6f82f6	2636928e-9ac1-4d59-853f-c6ce30fcee28	3968234f5422c3ab86dae6f2dea68c0c81d70a62a742278135c7a798ee01d18c	2026-06-10 10:51:46	2026-06-03 10:52:57.924	2026-06-03 10:51:46.183
cb29360e-bc07-4de1-8fc8-ea2706a40964	ddab961a-7715-4527-b44f-50d581b982a7	a131423c3df7d629f7c10ab07defee9c92ceccfd4460afdccc782e65e84bef76	2026-06-10 10:47:34	2026-06-03 11:00:14.581	2026-06-03 10:47:34.229
67595203-8b56-45ae-8fdd-35ce71379c94	57475927-959f-4f01-ac65-815103eb5981	ff5db678cde250356f950100842c07618426c6ff6c6b48d87588b92cef4b1858	2026-06-10 11:01:26	\N	2026-06-03 11:01:26.49
4a70c5c4-390c-4d45-baa1-3a8be697d547	57475927-959f-4f01-ac65-815103eb5981	4f00e017cce428c76879c83cac5ee2f285dd0f5a47ec562baaa4720cdf2ef036	2026-06-10 10:37:59	2026-06-03 11:01:26.478	2026-06-03 10:37:59.039
54b35188-2596-4212-bdd8-2e271d4e746a	ddab961a-7715-4527-b44f-50d581b982a7	5977bb188d1e6394b5f5d06b4bab927346b36e3f9c39b8d95f5d5bccb7ea6ca0	2026-06-10 11:02:18	2026-06-03 11:04:45.89	2026-06-03 11:02:18.933
fba15bec-b3c1-42c9-8b47-7984024f62bb	ddab961a-7715-4527-b44f-50d581b982a7	923dbcca92c88e70581cf85108f2a1b0fce871b1150d04cc9ab778c10a50f392	2026-06-10 11:28:23	2026-06-03 11:33:05.219	2026-06-03 11:28:23.024
9ddfae2f-4994-4222-af5f-65ebd4b9a924	ddab961a-7715-4527-b44f-50d581b982a7	0120fc8d74a0380423734a9fde11a3abadcbd0a0cc8e4a87a51fa091276e783e	2026-06-10 11:35:55	2026-06-03 11:36:00.834	2026-06-03 11:35:55.788
aaa057e5-6064-41f2-960f-19bcee63d03d	ddab961a-7715-4527-b44f-50d581b982a7	943e8db444a498e1bcf4ee7f3a37c201ceb2ee1597c928fc6ca5896b5e696a22	2026-06-10 11:37:42	2026-06-03 11:37:46.32	2026-06-03 11:37:42.643
6c86a034-63c5-4167-94dc-f09180a40c65	ddab961a-7715-4527-b44f-50d581b982a7	05f6e79bdaa1b4887175e4b71156bcf1b78988eaa0f525d62462fee2fc307327	2026-06-10 11:46:21	\N	2026-06-03 11:46:21.759
c7d11b37-f318-4c88-86a2-2cb670729ca6	57475927-959f-4f01-ac65-815103eb5981	7e13dfe8318275b25eb3318f3d34bf7b90c9f6af48840105810f180e7b446b0c	2026-06-10 11:50:39	\N	2026-06-03 11:50:39.931
452d2f91-3da1-4a1b-a5d2-ba8c160041f9	57475927-959f-4f01-ac65-815103eb5981	8e2fd2ac8590b7fa5066965505d31568b8e1d806b22191175c134826f8c562e1	2026-06-10 11:50:51	\N	2026-06-03 11:50:51.651
\.


--
-- Data for Name: Report; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Report" (id, type, title, payload, "generatedById", "exportFormat", "createdAt") FROM stdin;
29ea0142-06aa-4740-9304-48f3b3ae3c15	INSPECTION	Inspection Report	{"overdue": 0, "pending": 0, "completed": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 09:17:59.165
86e4eccb-e347-4240-9f49-b738209f6202	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 0, "nearExpiry": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 09:17:59.165
447338f3-6f4a-4156-8d87-06b1f45d7182	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 0, "nearExpiry": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 09:17:59.206
58665dbd-05b6-401a-bf82-b80b1b1a3026	INSPECTION	Inspection Report	{"overdue": 0, "pending": 0, "completed": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 09:17:59.21
4b4232af-fb24-4412-aba3-9d9861718f62	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 0, "nearExpiry": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 09:19:10.136
ca71fe44-acfc-46de-9ef3-5075440e4e64	INSPECTION	Inspection Report	{"overdue": 0, "pending": 0, "completed": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 09:19:10.137
c05f5a08-3303-4267-a0fc-2bb5df2ed4f9	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 0, "nearExpiry": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 09:19:10.168
82c91002-bda5-49e8-b6e6-77c151bf3896	INSPECTION	Inspection Report	{"overdue": 0, "pending": 0, "completed": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 09:19:10.169
a40bfbb2-40b4-4443-a2b5-70f4b80b30b3	INSPECTION	Inspection Report	{"overdue": 0, "pending": 0, "completed": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 09:22:20.109
27e5e876-60bc-4f20-9cbf-1055df11fc9f	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 0, "nearExpiry": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 09:22:20.111
69088d5f-755c-49c6-85d8-be444a6a2b34	INSPECTION	Inspection Report	{"overdue": 0, "pending": 0, "completed": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 09:22:20.136
9048e22b-4915-4e6d-a0fe-186fc8c14170	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 0, "nearExpiry": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 09:22:20.138
5d0c8a18-7ebe-400f-b8fd-49e8e09fc950	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 0, "nearExpiry": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 09:23:00.947
006067d5-cf15-41c1-a91d-0dcb158b256e	INSPECTION	Inspection Report	{"overdue": 0, "pending": 0, "completed": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 09:23:00.958
a215f132-e547-41a6-bc4c-be20cabdc815	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 0, "nearExpiry": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 09:23:00.974
5aef813f-bb36-4a61-a506-65521f0d4bff	INSPECTION	Inspection Report	{"overdue": 0, "pending": 0, "completed": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 09:23:00.986
0478edce-1e2f-424a-a79c-a51488471e96	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 0, "nearExpiry": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 09:41:49.158
84ae7240-e560-4994-909f-977bdc22c6e9	INSPECTION	Inspection Report	{"overdue": 0, "pending": 0, "completed": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 09:41:49.173
98f70eb9-2db1-43ad-88a4-3e6d44a4106a	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 0, "nearExpiry": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 09:41:49.198
7f1ad5a8-48cc-440d-8b23-8c7f9c38aa5b	INSPECTION	Inspection Report	{"overdue": 0, "pending": 0, "completed": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 09:41:49.201
1d5a7996-fc92-4e8e-b587-8530bf03dbb2	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 0, "nearExpiry": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 09:53:57.05
934d26b7-6608-45be-bd8a-c3a0f20f8f0b	INSPECTION	Inspection Report	{"overdue": 0, "pending": 0, "completed": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 09:53:57.074
d48fd4c5-5c46-403d-99d7-1352bfa27c3a	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 0, "nearExpiry": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 09:53:57.098
1e4d54c8-2f1b-4e51-bcd5-840197c77e14	INSPECTION	Inspection Report	{"overdue": 0, "pending": 0, "completed": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 09:53:57.103
6a09b6d1-d9d7-4f1a-b724-b9a0205dc7e8	INSPECTION	Inspection Report	{"overdue": 0, "pending": 0, "completed": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 09:54:26.56
a977e1b0-02ef-4c32-ab06-41d014e8216b	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 0, "nearExpiry": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 09:54:26.558
51504f26-4625-4767-b33a-03f5a309647d	INSPECTION	Inspection Report	{"overdue": 0, "pending": 0, "completed": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 09:54:26.584
14fb6346-d176-45d5-b839-7168bcc8e889	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 0, "nearExpiry": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 09:54:26.602
b000404a-e52b-473d-b7fe-77ffde344b86	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 0, "nearExpiry": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 09:55:14.697
c26cde9a-918f-45bc-abe2-29b4aee78976	INSPECTION	Inspection Report	{"overdue": 0, "pending": 0, "completed": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 09:55:14.698
d791e7ca-630a-402a-8e31-5b0edf8aa5c8	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 0, "nearExpiry": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 09:55:14.726
9654f7a8-db7a-416a-8dd6-5562d6d42c89	INSPECTION	Inspection Report	{"overdue": 0, "pending": 0, "completed": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 09:55:14.727
ce52c18b-3d83-4255-be6e-74b8b53f2f7a	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 0, "nearExpiry": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 09:55:44.062
59ba9b9b-19c7-41f7-b3b0-349f4d19b294	INSPECTION	Inspection Report	{"overdue": 0, "pending": 0, "completed": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 09:55:44.064
c2b546d6-95db-451d-be04-5da055cfb8a6	INSPECTION	Inspection Report	{"overdue": 0, "pending": 0, "completed": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 09:55:44.102
61aa0fb8-28af-4de5-8ff8-a879f7255963	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 0, "nearExpiry": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 09:55:44.103
13e9ea16-ed85-4666-9718-776ce94c0158	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 1, "nearExpiry": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 09:59:18.992
00e5ae53-0395-4639-af75-66e35d17ffee	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 1, "nearExpiry": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 09:59:19.017
a80a5708-b87a-4686-ab7c-5e9641c2f42f	INSPECTION	Inspection Report	{"overdue": 0, "pending": 0, "completed": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 09:59:19.085
79539451-31a7-4ebe-93d4-95d0734970f5	INSPECTION	Inspection Report	{"overdue": 0, "pending": 0, "completed": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 09:59:19.11
b3ef8ac2-326c-4286-876d-84e060b9fcf2	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 1, "nearExpiry": 0}	2636928e-9ac1-4d59-853f-c6ce30fcee28	\N	2026-06-03 10:12:14.723
59e8a40d-4fff-4443-be29-d2606db5c1b1	INSPECTION	Inspection Report	{"overdue": 0, "pending": 0, "completed": 0}	2636928e-9ac1-4d59-853f-c6ce30fcee28	\N	2026-06-03 10:12:14.74
afbb1948-cbf5-45c0-a212-ab0bb3d5c515	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 1, "nearExpiry": 0}	2636928e-9ac1-4d59-853f-c6ce30fcee28	\N	2026-06-03 10:12:14.77
930be6c0-5db7-4c54-a074-d13b81766466	INSPECTION	Inspection Report	{"overdue": 0, "pending": 0, "completed": 0}	2636928e-9ac1-4d59-853f-c6ce30fcee28	\N	2026-06-03 10:12:14.777
651aa530-252f-4377-b20f-f8d47ae35f5f	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 1, "nearExpiry": 0}	2636928e-9ac1-4d59-853f-c6ce30fcee28	\N	2026-06-03 10:12:29.628
05d3d071-d07c-41d9-8a21-da11b1833186	INSPECTION	Inspection Report	{"overdue": 0, "pending": 0, "completed": 0}	2636928e-9ac1-4d59-853f-c6ce30fcee28	\N	2026-06-03 10:12:29.63
6551ee7b-5fc9-463a-b2cd-c53da618a25e	INSPECTION	Inspection Report	{"overdue": 0, "pending": 0, "completed": 0}	2636928e-9ac1-4d59-853f-c6ce30fcee28	\N	2026-06-03 10:12:29.657
90739954-0012-4495-9260-632aa3587e7e	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 1, "nearExpiry": 0}	2636928e-9ac1-4d59-853f-c6ce30fcee28	\N	2026-06-03 10:12:29.664
67feeba0-87a1-4e30-a738-8d65707fe568	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 1, "nearExpiry": 0}	2636928e-9ac1-4d59-853f-c6ce30fcee28	\N	2026-06-03 10:14:16.372
422afbb4-160d-4e95-98a2-1e5d5331e78f	INSPECTION	Inspection Report	{"overdue": 0, "pending": 0, "completed": 0}	2636928e-9ac1-4d59-853f-c6ce30fcee28	\N	2026-06-03 10:14:16.372
78c15314-0b82-474e-a9d5-ba39d0595e5b	INSPECTION	Inspection Report	{"overdue": 0, "pending": 0, "completed": 0}	2636928e-9ac1-4d59-853f-c6ce30fcee28	\N	2026-06-03 10:14:16.396
f79a1cc1-13ae-4594-a422-5ddc09f9d5e3	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 1, "nearExpiry": 0}	2636928e-9ac1-4d59-853f-c6ce30fcee28	\N	2026-06-03 10:14:16.395
bbe900b3-9ef3-4e60-a1b8-a4f1e1cbadc9	INSPECTION	Inspection Report	{"overdue": 0, "pending": 1, "completed": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 10:33:37.597
282d6325-817c-4016-8f46-05af7dd21685	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 1, "nearExpiry": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 10:33:37.596
96ec06ee-3fbd-4c7b-820f-011c8d0d0bde	INSPECTION	Inspection Report	{"overdue": 0, "pending": 1, "completed": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 10:33:37.621
9b36abca-ed93-4738-b423-38119b643a46	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 1, "nearExpiry": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 10:33:37.627
52359747-2469-435e-be02-26cef74c471e	INSPECTION	Inspection Report	{"overdue": 0, "pending": 2, "completed": 0}	2636928e-9ac1-4d59-853f-c6ce30fcee28	\N	2026-06-03 10:34:50.337
cf5fcd71-e710-4db9-9817-5c09720e65ba	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 1, "nearExpiry": 0}	2636928e-9ac1-4d59-853f-c6ce30fcee28	\N	2026-06-03 10:34:50.336
1f5a5db2-9791-456d-81b3-02a92e933a58	INSPECTION	Inspection Report	{"overdue": 0, "pending": 2, "completed": 0}	2636928e-9ac1-4d59-853f-c6ce30fcee28	\N	2026-06-03 10:34:50.357
b8f30c77-98cc-46fb-8c0b-8b17d9e12f02	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 1, "nearExpiry": 0}	2636928e-9ac1-4d59-853f-c6ce30fcee28	\N	2026-06-03 10:34:50.358
81bd7892-171e-4210-a365-8a5f1f70617a	MAINTENANCE	Maintenance Report	{"frequency": [{"_count": {"extinguisherId": 1}, "extinguisherId": "4f46139c-999d-4e6b-906a-2fce5533c70e"}], "historyCount": 1, "recentActivities": [{"id": "687f25b6-2b21-4586-9dda-927089971247", "notes": "", "createdAt": "2026-06-03T10:36:35.487Z", "createdBy": {"id": "2636928e-9ac1-4d59-853f-c6ce30fcee28", "name": "Queen Gentille Ishimwe", "email": "qishimwe0@gmail.com"}, "deletedAt": null, "updatedAt": "2026-06-03T10:36:35.487Z", "actionTaken": "Replacing", "createdById": "2636928e-9ac1-4d59-853f-c6ce30fcee28", "extinguisher": {"id": "4f46139c-999d-4e6b-906a-2fce5533c70e", "code": "S01", "size": "12 lb", "type": "Water", "status": "ACTIVE", "userId": "57475927-959f-4f01-ac65-815103eb5981", "location": "Ruhango", "createdAt": "2026-06-03T09:59:04.080Z", "deletedAt": null, "updatedAt": "2026-06-03T10:11:03.729Z", "expiryDate": "2026-07-18T00:00:00.000Z", "serialNumber": "S01", "extinguisherSize": null, "extinguisherType": null, "installationDate": "2026-06-02T00:00:00.000Z"}, "extinguisherId": "4f46139c-999d-4e6b-906a-2fce5533c70e", "maintenanceDate": "2026-06-04T00:00:00.000Z", "recommendations": "Relace", "issuesIdentified": "Leakage"}]}	2636928e-9ac1-4d59-853f-c6ce30fcee28	\N	2026-06-03 10:36:42.253
c6ad12e2-0af3-45d8-9328-eb08b3e5993a	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 1, "nearExpiry": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 10:37:32.064
4d02c679-42b3-4c00-8bde-d106420ca0fa	INSPECTION	Inspection Report	{"overdue": 0, "pending": 1, "completed": 1}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 10:37:32.065
6fafe773-d9d1-4efe-9d66-2476faabdf9c	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 1, "nearExpiry": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 10:37:32.09
330f53f2-600e-44d3-ad20-fa27ffc03351	INSPECTION	Inspection Report	{"overdue": 0, "pending": 1, "completed": 1}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 10:37:32.091
a6042b9c-d5ad-4b23-894e-5abf095a4c4a	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 1, "nearExpiry": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 10:47:34.368
55129934-0ec1-4123-83e6-b3eb1f3dc4fd	INSPECTION	Inspection Report	{"overdue": 0, "pending": 1, "completed": 1}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 10:47:34.383
ad5ca06e-2bba-4dc1-a295-54ad2d6c2911	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 1, "nearExpiry": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 10:47:34.395
2226a832-3c2a-4f38-9d46-4826e50c6690	INSPECTION	Inspection Report	{"overdue": 0, "pending": 1, "completed": 1}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 10:47:34.403
87c15d25-95be-409f-9653-ea2bfd47f9de	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 1, "nearExpiry": 0}	2636928e-9ac1-4d59-853f-c6ce30fcee28	\N	2026-06-03 10:51:46.241
b4dbe219-2bee-49c0-bed3-a44fed4b7605	INSPECTION	Inspection Report	{"overdue": 0, "pending": 1, "completed": 1}	2636928e-9ac1-4d59-853f-c6ce30fcee28	\N	2026-06-03 10:51:46.244
582a6944-3d8c-4fdd-982f-5f66878411d5	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 1, "nearExpiry": 0}	2636928e-9ac1-4d59-853f-c6ce30fcee28	\N	2026-06-03 10:51:46.271
bd4cb405-e20a-49f9-81a7-8313d5d1e958	INSPECTION	Inspection Report	{"overdue": 0, "pending": 1, "completed": 1}	2636928e-9ac1-4d59-853f-c6ce30fcee28	\N	2026-06-03 10:51:46.272
25e73a18-cea8-4633-b4f0-5ec98759cf97	INSPECTION	Inspection Report	{"overdue": 0, "pending": 1, "completed": 1}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 10:59:27.431
c906be6a-3b36-493c-a900-8bde53a79eaf	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 1, "nearExpiry": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 10:59:27.429
4836a2bd-495f-4a0a-ab1a-72f1e0ebce10	INSPECTION	Inspection Report	{"overdue": 0, "pending": 1, "completed": 1}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 10:59:27.459
0d799367-99fb-44a2-abf7-c8c3ccacd7ad	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 1, "nearExpiry": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 10:59:27.465
4e718208-ea16-4060-88e0-54895f0743fb	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 1, "nearExpiry": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 11:02:19.024
efa3ab8a-a196-443e-9d03-1a2d2529b3f1	INSPECTION	Inspection Report	{"overdue": 0, "pending": 1, "completed": 1}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 11:02:19.025
f5a547f8-8bf4-4fe5-af61-3d33045acb54	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 1, "nearExpiry": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 11:02:19.056
f83c0cc4-c4f6-4696-807d-0a571be3a12e	INSPECTION	Inspection Report	{"overdue": 0, "pending": 1, "completed": 1}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 11:02:19.057
88493fca-abd9-448d-99d8-28b65af584c6	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 1, "nearExpiry": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 11:02:46.826
add499a8-e565-4854-a464-93a0bd9aa880	INSPECTION	Inspection Report	{"overdue": 0, "pending": 1, "completed": 1}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 11:02:46.827
913095df-1f07-42ce-82de-e8cab25eae20	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 1, "nearExpiry": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 11:02:46.848
5d0565ed-bc80-4517-b126-a877ceb5d8e6	INSPECTION	Inspection Report	{"overdue": 0, "pending": 1, "completed": 1}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 11:02:46.848
6a72ef48-b881-4d40-8dc2-01740000ea52	INSPECTION	Inspection Report	{"overdue": 0, "pending": 1, "completed": 1}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 11:28:23.257
73f6edd7-4eff-43a7-ba2e-6b483115e5eb	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 1, "nearExpiry": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 11:28:23.256
21803e2d-6eb7-40f9-b305-c8624eca9a6c	INSPECTION	Inspection Report	{"overdue": 0, "pending": 1, "completed": 1}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 11:28:23.301
bd2f355e-a7c5-411e-8418-868d646f4ac4	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 1, "nearExpiry": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 11:28:23.307
5a4e0ee5-1bea-4b2a-836b-c0ac9e5d1437	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 1, "nearExpiry": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 11:35:55.921
54bc54dc-16cd-4dd6-8c51-e467036629d8	INSPECTION	Inspection Report	{"overdue": 0, "pending": 1, "completed": 1}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 11:35:55.936
93095c72-4157-44ee-aab4-61663ce9210b	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 1, "nearExpiry": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 11:35:55.942
cc8a2da2-3842-453b-b083-71b617181070	INSPECTION	Inspection Report	{"overdue": 0, "pending": 1, "completed": 1}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 11:35:55.95
f39ea37e-ac67-490e-9f27-13df0cb32051	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 1, "nearExpiry": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 11:37:42.717
8cbd4ab1-a534-4298-804e-b8cf9ba3f004	INSPECTION	Inspection Report	{"overdue": 0, "pending": 1, "completed": 1}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 11:37:42.72
3cc96cfe-7c46-409d-90a2-aabb9fe6ccef	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 1, "nearExpiry": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 11:37:42.753
7717746b-8697-4eaf-897f-940e5a2ea423	INSPECTION	Inspection Report	{"overdue": 0, "pending": 1, "completed": 1}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 11:37:42.754
40e3ca0c-e2f0-4b6c-ad3f-6172043f921a	INSPECTION	Inspection Report	{"overdue": 0, "pending": 1, "completed": 1}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 11:46:22.016
57f81056-51af-431f-9aa4-4d33d30b1888	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 1, "nearExpiry": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 11:46:22.016
c1970aa7-54fc-4ec0-968d-0658e16c2c1d	INSPECTION	Inspection Report	{"overdue": 0, "pending": 1, "completed": 1}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 11:46:22.043
bc850a26-9ef8-4d54-8062-48a6ba81c4dc	COMPLIANCE	Compliance Report	{"expired": 0, "compliant": 1, "nearExpiry": 0}	ddab961a-7715-4527-b44f-50d581b982a7	\N	2026-06-03 11:46:22.048
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, "firstName", "lastName", name, email, password, role, "isVerified", otp, "otpExpiresAt", "deletedAt", "createdAt", "updatedAt") FROM stdin;
c011c710-8535-4922-adaa-5a13c18ac934	Jolie Princesse	Ishimwe	Jolie Princesse Ishimwe	princesseishimwejolie@gmail.com	$2b$12$duoEeMoGlEpfL98C9OsDR.LPba9csUmin4ZYYah7iVcZ1nZ3Sm2Zi	USER	f	\N	\N	2026-06-03 11:46:40.027	2026-06-03 11:42:59.653	2026-06-03 11:46:40.028
2636928e-9ac1-4d59-853f-c6ce30fcee28	Queen Gentille	Ishimwe	Queen Gentille Ishimwe	qishimwe0@gmail.com	$2b$12$scapk0834Gl5VeJ5RUgtJey2A2Q6LQk6jknH4o8iAnTPNKfwVXH0e	INSPECTOR	t	\N	\N	2026-06-03 11:46:43.73	2026-06-03 09:20:11.595	2026-06-03 11:46:43.731
57475927-959f-4f01-ac65-815103eb5981	Hope	Nshimiyimana	Hope Nshimiyimana	hopendindabahizi@gmail.com	$2b$12$lalBcBTDXAMQ0RKlGfYWAO62CrA1sqd5qaTvF2o01Qtdg03orpFkW	USER	t	\N	\N	\N	2026-06-03 09:32:50.554	2026-06-03 11:50:39.92
ddab961a-7715-4527-b44f-50d581b982a7	Ishimwe	Jolie Princesse	Ishimwe Jolie Princesse	jolieprincesseishimwe@gmail.com	$2b$12$bPA43c8KO1N8Cr41IBZpPeJPlhh0mnvEnMxLXidGxV0n0e.UxrAbC	ADMIN	t	\N	\N	\N	2026-06-03 09:11:51.657	2026-06-03 11:18:01.669
84ca50aa-0546-43ba-b36a-39dc94a06b37	Jolie Princesse	Ishimwe	Jolie Princesse Ishimwe	uwimanaeva204@gmail.com	$2b$12$yfwSavD.Ex3Ji4p8/7V60eryLUi8nKzgfoGMNUBnRR9eExBvZbZ4S	USER	f	\N	\N	2026-06-03 11:46:38.191	2026-06-03 11:45:33.917	2026-06-03 11:46:38.193
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, name, description, "createdAt", "updatedAt", "deletedAt") FROM stdin;
89cf006e-9073-4530-b942-9b63b7fac0d6	ADMIN	Manages users, inventory, reports, and system-wide settings.	2026-06-03 10:03:23.164	2026-06-03 11:18:01.421	\N
db3289dd-1ad6-4bfd-8c8c-081d24d744ed	INSPECTOR	Conducts inspections and records maintenance activities.	2026-06-03 10:03:23.17	2026-06-03 11:18:01.442	\N
f3806b52-7ab1-443c-8699-00a1efbf9f09	USER	Views extinguisher status, notifications, and inspection history.	2026-06-03 10:03:23.171	2026-06-03 11:18:01.443	\N
\.


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: FireExtinguisher FireExtinguisher_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."FireExtinguisher"
    ADD CONSTRAINT "FireExtinguisher_pkey" PRIMARY KEY (id);


--
-- Name: InspectionResult InspectionResult_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InspectionResult"
    ADD CONSTRAINT "InspectionResult_pkey" PRIMARY KEY (id);


--
-- Name: InspectionSchedule InspectionSchedule_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InspectionSchedule"
    ADD CONSTRAINT "InspectionSchedule_pkey" PRIMARY KEY (id);


--
-- Name: MaintenanceLog MaintenanceLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MaintenanceLog"
    ADD CONSTRAINT "MaintenanceLog_pkey" PRIMARY KEY (id);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: Otp Otp_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Otp"
    ADD CONSTRAINT "Otp_pkey" PRIMARY KEY (id);


--
-- Name: RefreshToken RefreshToken_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RefreshToken"
    ADD CONSTRAINT "RefreshToken_pkey" PRIMARY KEY (id);


--
-- Name: Report Report_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Report"
    ADD CONSTRAINT "Report_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: AuditLog_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AuditLog_createdAt_idx" ON public."AuditLog" USING btree ("createdAt");


--
-- Name: AuditLog_entity_entityId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AuditLog_entity_entityId_idx" ON public."AuditLog" USING btree (entity, "entityId");


--
-- Name: AuditLog_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AuditLog_userId_idx" ON public."AuditLog" USING btree ("userId");


--
-- Name: FireExtinguisher_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "FireExtinguisher_code_key" ON public."FireExtinguisher" USING btree (code);


--
-- Name: FireExtinguisher_deletedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "FireExtinguisher_deletedAt_idx" ON public."FireExtinguisher" USING btree ("deletedAt");


--
-- Name: FireExtinguisher_expiryDate_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "FireExtinguisher_expiryDate_idx" ON public."FireExtinguisher" USING btree ("expiryDate");


--
-- Name: FireExtinguisher_location_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "FireExtinguisher_location_idx" ON public."FireExtinguisher" USING btree (location);


--
-- Name: FireExtinguisher_serialNumber_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "FireExtinguisher_serialNumber_key" ON public."FireExtinguisher" USING btree ("serialNumber");


--
-- Name: FireExtinguisher_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "FireExtinguisher_status_idx" ON public."FireExtinguisher" USING btree (status);


--
-- Name: InspectionResult_completedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "InspectionResult_completedAt_idx" ON public."InspectionResult" USING btree ("completedAt");


--
-- Name: InspectionResult_extinguisherId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "InspectionResult_extinguisherId_idx" ON public."InspectionResult" USING btree ("extinguisherId");


--
-- Name: InspectionResult_scheduleId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "InspectionResult_scheduleId_key" ON public."InspectionResult" USING btree ("scheduleId");


--
-- Name: InspectionSchedule_inspectorId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "InspectionSchedule_inspectorId_idx" ON public."InspectionSchedule" USING btree ("inspectorId");


--
-- Name: InspectionSchedule_scheduledDate_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "InspectionSchedule_scheduledDate_idx" ON public."InspectionSchedule" USING btree ("scheduledDate");


--
-- Name: InspectionSchedule_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "InspectionSchedule_status_idx" ON public."InspectionSchedule" USING btree (status);


--
-- Name: MaintenanceLog_deletedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "MaintenanceLog_deletedAt_idx" ON public."MaintenanceLog" USING btree ("deletedAt");


--
-- Name: MaintenanceLog_extinguisherId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "MaintenanceLog_extinguisherId_idx" ON public."MaintenanceLog" USING btree ("extinguisherId");


--
-- Name: MaintenanceLog_maintenanceDate_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "MaintenanceLog_maintenanceDate_idx" ON public."MaintenanceLog" USING btree ("maintenanceDate");


--
-- Name: Notification_sentAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Notification_sentAt_idx" ON public."Notification" USING btree ("sentAt");


--
-- Name: Notification_userId_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Notification_userId_status_idx" ON public."Notification" USING btree ("userId", status);


--
-- Name: Otp_email_purpose_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Otp_email_purpose_idx" ON public."Otp" USING btree (email, purpose);


--
-- Name: Otp_expiresAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Otp_expiresAt_idx" ON public."Otp" USING btree ("expiresAt");


--
-- Name: RefreshToken_expiresAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "RefreshToken_expiresAt_idx" ON public."RefreshToken" USING btree ("expiresAt");


--
-- Name: RefreshToken_tokenHash_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON public."RefreshToken" USING btree ("tokenHash");


--
-- Name: RefreshToken_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "RefreshToken_userId_idx" ON public."RefreshToken" USING btree ("userId");


--
-- Name: Report_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Report_createdAt_idx" ON public."Report" USING btree ("createdAt");


--
-- Name: Report_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Report_type_idx" ON public."Report" USING btree (type);


--
-- Name: User_deletedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "User_deletedAt_idx" ON public."User" USING btree ("deletedAt");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_role_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "User_role_idx" ON public."User" USING btree (role);


--
-- Name: roles_deletedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "roles_deletedAt_idx" ON public.roles USING btree ("deletedAt");


--
-- Name: roles_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX roles_name_key ON public.roles USING btree (name);


--
-- Name: AuditLog AuditLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: FireExtinguisher FireExtinguisher_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."FireExtinguisher"
    ADD CONSTRAINT "FireExtinguisher_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: InspectionResult InspectionResult_completedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InspectionResult"
    ADD CONSTRAINT "InspectionResult_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InspectionResult InspectionResult_extinguisherId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InspectionResult"
    ADD CONSTRAINT "InspectionResult_extinguisherId_fkey" FOREIGN KEY ("extinguisherId") REFERENCES public."FireExtinguisher"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InspectionResult InspectionResult_scheduleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InspectionResult"
    ADD CONSTRAINT "InspectionResult_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES public."InspectionSchedule"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InspectionSchedule InspectionSchedule_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InspectionSchedule"
    ADD CONSTRAINT "InspectionSchedule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: InspectionSchedule InspectionSchedule_extinguisherId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InspectionSchedule"
    ADD CONSTRAINT "InspectionSchedule_extinguisherId_fkey" FOREIGN KEY ("extinguisherId") REFERENCES public."FireExtinguisher"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InspectionSchedule InspectionSchedule_inspectorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InspectionSchedule"
    ADD CONSTRAINT "InspectionSchedule_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MaintenanceLog MaintenanceLog_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MaintenanceLog"
    ADD CONSTRAINT "MaintenanceLog_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: MaintenanceLog MaintenanceLog_extinguisherId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MaintenanceLog"
    ADD CONSTRAINT "MaintenanceLog_extinguisherId_fkey" FOREIGN KEY ("extinguisherId") REFERENCES public."FireExtinguisher"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Notification Notification_extinguisherId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_extinguisherId_fkey" FOREIGN KEY ("extinguisherId") REFERENCES public."FireExtinguisher"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Notification Notification_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Otp Otp_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Otp"
    ADD CONSTRAINT "Otp_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RefreshToken RefreshToken_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RefreshToken"
    ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Report Report_generatedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Report"
    ADD CONSTRAINT "Report_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

