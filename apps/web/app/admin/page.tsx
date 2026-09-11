import { TransactionStatus } from '@seti/shared';

interface TransactionRow {
  id: string;
  status: TransactionStatus;
  recipientHash: string;
  transferAmount: string;
  settlementTxHash?: string;
  payoutReference?: string;
  createdAt: string;
}

async function getTransactions(): Promise<TransactionRow[]> {
  const res = await fetch('http://localhost:3001/api/v1/transactions?userId=00000000-0000-0000-0000-000000000001', {
    cache: 'no-store',
  });
  if (!res.ok) return [];
  return res.json();
}

export default async function AdminPage() {
  const transactions = await getTransactions();

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: 40, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Seti Admin</h1>
      <p>Prototype transaction monitor.</p>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 24 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #111' }}>
            <th style={{ textAlign: 'left', padding: '8px 0' }}>ID</th>
            <th style={{ textAlign: 'left', padding: '8px 0' }}>Status</th>
            <th style={{ textAlign: 'left', padding: '8px 0' }}>Recipient</th>
            <th style={{ textAlign: 'left', padding: '8px 0' }}>Amount</th>
            <th style={{ textAlign: 'left', padding: '8px 0' }}>Created</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.id} style={{ borderBottom: '1px solid #eaeaea' }}>
              <td style={{ padding: '12px 0', fontFamily: 'monospace', fontSize: 13 }}>{tx.id}</td>
              <td style={{ padding: '12px 0' }}>{tx.status}</td>
              <td style={{ padding: '12px 0', fontFamily: 'monospace', fontSize: 13 }}>{tx.recipientHash}</td>
              <td style={{ padding: '12px 0' }}>{tx.transferAmount}</td>
              <td style={{ padding: '12px 0' }}>{new Date(tx.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {transactions.length === 0 && <p style={{ color: '#787774', marginTop: 24 }}>No transactions yet.</p>}
    </main>
  );
}
