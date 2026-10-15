import { getLocale, getTranslations } from "next-intl/server";
import { rigidTable, type RigidColumn } from "@/data/rigid";
import { intlLocale } from "@/i18n/locales";

/**
 * Raggio minimo (piano E e H) e spessore di parete per misura, per curve, twist e disassati.
 * Solo le misure e le colonne con almeno un valore in data/rigid.ts; senza dati non si vede nulla.
 */
export async function RigidGeometryTable() {
  const { rows, columns } = rigidTable();
  if (!rows.length) return null;
  const t = await getTranslations("products.page");
  const tables = await getTranslations("tables");
  const fmt = new Intl.NumberFormat(intlLocale(await getLocale()), { maximumFractionDigits: 2 });
  const head: Record<RigidColumn, string> = { minRadiusE: t("rigidRadiusE"), minRadiusH: t("rigidRadiusH"), wall: t("rigidWall") };

  return (
    <div className="mt-10" data-rigid-table>
      <h3 className="text-display-s font-bold">{t("rigidTitle")}</h3>
      <div className="mt-4 overflow-x-auto border border-line">
        <table className="w-full min-w-[26rem] text-sm tabular">
          <thead className="bg-surface text-left">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">
                {t("rigidSize")}
              </th>
              {columns.map((c) => (
                <th key={c} scope="col" className="px-4 py-3 font-semibold">
                  {head[c]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.wr} className="border-t border-line">
                <th scope="row" className="px-4 py-3 text-left font-mono font-medium">
                  {r.wr}
                </th>
                {columns.map((c) => {
                  const v = r.values[c];
                  return (
                    <td key={c} className="px-4 py-3">
                      {v === null ? "—" : `${fmt.format(v)} mm`}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-muted">{tables("indicative")}</p>
    </div>
  );
}
