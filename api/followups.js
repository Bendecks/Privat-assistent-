const { neon } = require('@neondatabase/serverless');

const defaults = [
  ['bosch','Vaskemaskine · Bosch','Følg op senest mandag 7/9','Reparationsformular sendt torsdag 3/9. Kontrollér om Bosch har svaret. Hvis ikke, følg op på reparationssagen.'],
  ['koekken-stroem','Strømproblemer i køkkenet','Venter på Bent og Lasse','Elektrikeren oplyste 2/9, at der er en ekstra kraftgruppe. Forslag: begge opvaskemaskiner på samme fase og én separat fase til hver ovn. Afvent deres svar/løsning.'],
  ['skur-stroem','Strøm til skuret','Venter på tilbud','Elektrikeren var her 2/9 og vil sende et tilbud på mail. Følg op, hvis tilbuddet ikke kommer.'],
  ['proline','Ventilations-serviceaftale','Venter på Proline','Serviceaftale er oprettet. Proline skal vende tilbage med forslag til dato.'],
  ['trampolin','Trampolin-reklamation','Venter på svar fra Føtex · følg op senest tirsdag 8/9','Reklamation sendt til Føtex torsdag 3/9 med reservedelsnumre udfyldt. Afvent svar. Hvis der ikke er kommet svar, følg op senest tirsdag 8/9.']
];

async function db() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL mangler');
  const sql = neon(process.env.DATABASE_URL);
  await sql`CREATE TABLE IF NOT EXISTS followups (id text PRIMARY KEY, title text NOT NULL, status text NOT NULL DEFAULT '', note text NOT NULL DEFAULT '', done boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now())`;
  for (const d of defaults) await sql`INSERT INTO followups (id,title,status,note) VALUES (${d[0]},${d[1]},${d[2]},${d[3]}) ON CONFLICT (id) DO NOTHING`;
  return sql;
}

module.exports = async (req,res) => {
  try {
    const sql=await db();
    if(req.method==='GET') {
      const rows=await sql`SELECT id,title,status AS date,note,done,updated_at FROM followups ORDER BY updated_at ASC`;
      return res.status(200).json(rows);
    }
    if(req.method==='POST') {
      const f=req.body||{};
      if(!f.id||!f.title) return res.status(400).json({error:'id og title kræves'});
      const rows=await sql`INSERT INTO followups (id,title,status,note,done,updated_at) VALUES (${f.id},${f.title},${f.date||''},${f.note||''},${!!f.done},now()) ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title,status=EXCLUDED.status,note=EXCLUDED.note,done=EXCLUDED.done,updated_at=now() RETURNING id,title,status AS date,note,done,updated_at`;
      return res.status(200).json(rows[0]);
    }
    res.setHeader('Allow','GET, POST'); return res.status(405).json({error:'Method not allowed'});
  } catch(e) { console.error(e); return res.status(500).json({error:e.message}); }
};