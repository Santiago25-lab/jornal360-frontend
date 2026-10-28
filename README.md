# Jornal 360 · Frontend

Panel web de nómina y asistencia. Next.js 15 (App Router) + React 19 + Tailwind, en TypeScript.

## Desarrollo

```bash
npm install
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:3001/api
npm run dev
```

## Despliegue en Vercel

1. Importe este repositorio en Vercel (detecta Next.js solo).
2. En **Settings → Environment Variables** agregue `NEXT_PUBLIC_API_URL` = `https://SU-API.up.railway.app/api`.
3. Deploy. Si cambia la variable, vuelva a desplegar (se incrusta al compilar).

## Pantallas

- Panel: indicadores, costo por mes, pendientes, asistencia de hoy, obligaciones del año.
- Empleados, Asistencia (QR, kioscos, celulares, horas por aprobar), Novedades, Nómina (paso a paso de cada valor),
  Prestaciones, Retiros, Reportes y Configuración completa (parámetros, conceptos y fórmulas, calendario, turnos…).
- Públicas, sin sesión: `/pantalla-qr/[sede]` (pantalla de la entrada), `/marcar`, `/vincular`, `/kiosco`.
