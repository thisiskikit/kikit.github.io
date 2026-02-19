import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type EntryType = "income" | "expense";

type LedgerEntry = {
  id: string;
  date: string;
  type: EntryType;
  category: string;
  description: string;
  amount: number;
};

const STORAGE_KEY = "kikit-ledger-entries";

const CATEGORIES = ["Salary", "Food", "Transport", "Living", "Savings", "Other"];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

const toMonthKey = (dateString: string) => dateString.slice(0, 7);

const todayIso = () => new Date().toISOString().slice(0, 10);
const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

export default function FeatureHouseholdLedgerPage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [month, setMonth] = useState(currentMonth());
  const [date, setDate] = useState(todayIso());
  const [type, setType] = useState<EntryType>("income");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as LedgerEntry[];
      if (Array.isArray(parsed)) setEntries(parsed);
    } catch {
      // ignore corrupted local storage payloads
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  const monthEntries = useMemo(
    () => entries.filter((entry) => toMonthKey(entry.date) === month),
    [entries, month],
  );

  const totalIncome = useMemo(
    () => monthEntries.filter((entry) => entry.type === "income").reduce((sum, entry) => sum + entry.amount, 0),
    [monthEntries],
  );
  const totalExpense = useMemo(
    () => monthEntries.filter((entry) => entry.type === "expense").reduce((sum, entry) => sum + entry.amount, 0),
    [monthEntries],
  );
  const totalBalance = totalIncome - totalExpense;

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const numericAmount = Math.floor(Number(amount));
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return;

    const hasCrypto = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function";
    const id = hasCrypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    const nextEntry: LedgerEntry = {
      id,
      date,
      type,
      category,
      description: description.trim(),
      amount: numericAmount,
    };
    setEntries((prev) => [nextEntry, ...prev]);

    setDate(todayIso());
    setType("income");
    setCategory(CATEGORIES[0]);
    setDescription("");
    setAmount("");
  };

  const removeEntry = (id: string) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
  };

  return (
    <div className="p-6 space-y-4 max-w-6xl mx-auto">
      <PageHeader
        title="Household Ledger"
        description="Record income and expense items, then review monthly totals."
        helpTitle="Household Ledger"
        helpLines={[
          "Entries are saved in localStorage on this browser.",
          "Totals are calculated per selected month.",
          "Use this as a lightweight internal bookkeeping tool.",
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total Income</p>
            <p className="text-2xl font-bold text-emerald-500">{formatCurrency(totalIncome)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total Expense</p>
            <p className="text-2xl font-bold text-rose-500">{formatCurrency(totalExpense)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className={`text-2xl font-bold ${totalBalance >= 0 ? "text-foreground" : "text-rose-500"}`}>
              {formatCurrency(totalBalance)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1.9fr]">
        <Card>
          <CardContent className="pt-6">
            <form className="space-y-3" onSubmit={onSubmit}>
              <div className="space-y-1">
                <Label htmlFor="ledger-date">Date</Label>
                <Input
                  id="ledger-date"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label>Type</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={type === "income" ? "default" : "outline"}
                    onClick={() => setType("income")}
                    className="flex-1"
                  >
                    Income
                  </Button>
                  <Button
                    type="button"
                    variant={type === "expense" ? "default" : "outline"}
                    onClick={() => setType("expense")}
                    className="flex-1"
                  >
                    Expense
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((item) => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="ledger-description">Memo</Label>
                <Input
                  id="ledger-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Optional memo"
                  maxLength={40}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="ledger-amount">Amount</Label>
                <Input
                  id="ledger-amount"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0"
                  required
                />
              </div>

              <Button type="submit" className="w-full">Add Entry</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">Entries</p>
              <Input
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="max-w-[180px]"
              />
            </div>

            {monthEntries.length === 0 ? (
              <div className="rounded border border-dashed p-8 text-center text-sm text-muted-foreground">
                No entries for this month.
              </div>
            ) : (
              <div className="space-y-2">
                {monthEntries.map((entry) => (
                  <div key={entry.id} className="rounded border px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs mb-1">
                      <Badge variant={entry.type === "income" ? "default" : "secondary"}>
                        {entry.type}
                      </Badge>
                      <Badge variant="outline">{entry.category}</Badge>
                      <span className="text-muted-foreground">{entry.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm flex-1 truncate">{entry.description || "-"}</p>
                      <p className={`font-semibold ${entry.type === "income" ? "text-emerald-500" : "text-rose-500"}`}>
                        {formatCurrency(entry.amount)}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEntry(entry.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
