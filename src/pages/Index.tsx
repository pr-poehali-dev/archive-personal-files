import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Citizen {
  id: number;
  lastName: string;
  firstName: string;
  middleName: string;
  birthDate: string;
  caseNumber: string;
  address: string;
  notes: string;
  createdAt: string;
}

const initialData: Citizen[] = [
  {
    id: 1,
    lastName: 'Орлов',
    firstName: 'Сергей',
    middleName: 'Петрович',
    birthDate: '1985-03-12',
    caseNumber: 'ЛД-0001/24',
    address: 'г. Москва, ул. Тверская, д. 12, кв. 5',
    notes: 'Личное дело открыто при поступлении на службу.',
    createdAt: '2024-01-15',
  },
  {
    id: 2,
    lastName: 'Соколова',
    firstName: 'Анна',
    middleName: 'Викторовна',
    birthDate: '1990-07-28',
    caseNumber: 'ЛД-0002/24',
    address: 'г. Санкт-Петербург, Невский пр., д. 88, кв. 14',
    notes: 'Передано из городского архива.',
    createdAt: '2024-02-03',
  },
  {
    id: 3,
    lastName: 'Кузнецов',
    firstName: 'Дмитрий',
    middleName: 'Александрович',
    birthDate: '1978-11-05',
    caseNumber: 'ЛД-0003/24',
    address: 'г. Казань, ул. Баумана, д. 3, кв. 21',
    notes: '',
    createdAt: '2024-03-19',
  },
];

type Tab = 'list' | 'add' | 'profile';

const fmtDate = (d: string) => {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}.${m}.${y}`;
};

const Index = () => {
  const [tab, setTab] = useState<Tab>('list');
  const [citizens, setCitizens] = useState<Citizen[]>(initialData);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState({
    lastName: '',
    firstName: '',
    middleName: '',
    birthDate: '',
    address: '',
    notes: '',
  });

  const selected = citizens.find((c) => c.id === selectedId) || null;

  const filtered = citizens.filter((c) =>
    `${c.lastName} ${c.firstName} ${c.middleName}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const openProfile = (id: number) => {
    setSelectedId(id);
    setTab('profile');
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.lastName || !form.firstName || !form.birthDate) return;
    const nextNum = String(citizens.length + 1).padStart(4, '0');
    const newCitizen: Citizen = {
      id: Date.now(),
      ...form,
      caseNumber: `ЛД-${nextNum}/24`,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setCitizens([newCitizen, ...citizens]);
    setForm({ lastName: '', firstName: '', middleName: '', birthDate: '', address: '', notes: '' });
    setSelectedId(newCitizen.id);
    setTab('profile');
  };

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'list', label: 'Реестр дел', icon: 'Files' },
    { key: 'add', label: 'Новое дело', icon: 'FilePlus2' },
    { key: 'profile', label: 'Карточка', icon: 'UserSquare' },
  ];

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      {/* Header */}
      <header className="border-b-4 border-accent bg-primary text-primary-foreground">
        <div className="container py-6 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center border-2 border-accent">
            <Icon name="Landmark" size={30} className="text-accent" />
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-600 uppercase tracking-wide leading-none">
              Государственный архив
            </h1>
            <p className="text-sm text-primary-foreground/70 mt-1 uppercase tracking-widest">
              Личные дела граждан
            </p>
          </div>
          <div className="ml-auto hidden md:flex flex-col items-end">
            <span className="font-display text-3xl font-700 text-accent leading-none">
              {citizens.length}
            </span>
            <span className="text-xs uppercase tracking-widest text-primary-foreground/60">
              дел в реестре
            </span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="border-b border-border bg-card">
        <div className="container flex gap-0">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              disabled={t.key === 'profile' && !selected}
              className={`flex items-center gap-2 px-5 py-4 text-sm uppercase tracking-wide font-500 border-b-2 transition-colors disabled:opacity-40 ${
                tab === t.key
                  ? 'border-accent text-primary'
                  : 'border-transparent text-muted-foreground hover:text-primary'
              }`}
            >
              <Icon name={t.icon} size={16} />
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="container py-8">
        {/* LIST */}
        {tab === 'list' && (
          <div className="animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Icon
                  name="Search"
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  placeholder="Поиск по ФИО..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-card rounded-none border-border"
                />
              </div>
              <Button
                onClick={() => setTab('add')}
                className="rounded-none uppercase tracking-wide gap-2"
              >
                <Icon name="Plus" size={16} />
                Добавить дело
              </Button>
            </div>

            <div className="border border-border bg-card">
              <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-border bg-secondary text-xs uppercase tracking-widest font-600 text-muted-foreground">
                <span className="col-span-2">№ дела</span>
                <span className="col-span-5">Фамилия Имя Отчество</span>
                <span className="col-span-3">Дата рождения</span>
                <span className="col-span-2 text-right">Действие</span>
              </div>
              {filtered.length === 0 && (
                <div className="px-5 py-12 text-center text-muted-foreground">
                  <Icon name="FolderSearch" size={40} className="mx-auto mb-3 opacity-40" />
                  Дела не найдены
                </div>
              )}
              {filtered.map((c, i) => (
                <div
                  key={c.id}
                  onClick={() => openProfile(c.id)}
                  className={`grid grid-cols-12 gap-4 px-5 py-4 items-center cursor-pointer border-b border-border last:border-0 hover:bg-secondary/60 transition-colors ${
                    i % 2 ? 'bg-secondary/20' : ''
                  }`}
                >
                  <span className="col-span-2 font-display font-600 text-primary">
                    {c.caseNumber}
                  </span>
                  <span className="col-span-5 font-500">
                    {c.lastName} {c.firstName} {c.middleName}
                  </span>
                  <span className="col-span-3 text-muted-foreground tabular-nums">
                    {fmtDate(c.birthDate)}
                  </span>
                  <span className="col-span-2 flex justify-end">
                    <Icon name="ChevronRight" size={18} className="text-accent" />
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ADD */}
        {tab === 'add' && (
          <div className="animate-fade-in max-w-2xl">
            <div className="mb-6 border-l-4 border-accent pl-4">
              <h2 className="font-display text-2xl uppercase tracking-wide text-primary">
                Открытие личного дела
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Заполните сведения о гражданине. Поля со знаком * обязательны.
              </p>
            </div>

            <form onSubmit={handleAdd} className="bg-card border border-border p-6 space-y-5">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="uppercase text-xs tracking-widest">Фамилия *</Label>
                  <Input
                    required
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="rounded-none"
                    placeholder="Иванов"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="uppercase text-xs tracking-widest">Имя *</Label>
                  <Input
                    required
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="rounded-none"
                    placeholder="Иван"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="uppercase text-xs tracking-widest">Отчество</Label>
                  <Input
                    value={form.middleName}
                    onChange={(e) => setForm({ ...form, middleName: e.target.value })}
                    className="rounded-none"
                    placeholder="Иванович"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="uppercase text-xs tracking-widest">Дата рождения *</Label>
                  <Input
                    required
                    type="date"
                    value={form.birthDate}
                    onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                    className="rounded-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="uppercase text-xs tracking-widest">Адрес регистрации</Label>
                  <Input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="rounded-none"
                    placeholder="г. Москва, ул. ..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="uppercase text-xs tracking-widest">Примечания</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="rounded-none min-h-24"
                  placeholder="Дополнительные сведения по делу..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" className="rounded-none uppercase tracking-wide gap-2">
                  <Icon name="Save" size={16} />
                  Зарегистрировать дело
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTab('list')}
                  className="rounded-none uppercase tracking-wide"
                >
                  Отмена
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* PROFILE */}
        {tab === 'profile' && selected && (
          <div className="animate-fade-in max-w-3xl">
            <button
              onClick={() => setTab('list')}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-4 uppercase tracking-wide"
            >
              <Icon name="ArrowLeft" size={16} />
              К реестру
            </button>

            <div className="bg-card border border-border">
              <div className="flex flex-col md:flex-row md:items-center gap-4 border-b border-border p-6 bg-secondary/30">
                <div className="flex h-20 w-20 items-center justify-center border-2 border-primary bg-primary text-primary-foreground font-display text-3xl font-700">
                  {selected.lastName[0]}
                  {selected.firstName[0]}
                </div>
                <div>
                  <p className="font-display text-sm uppercase tracking-widest text-accent font-600">
                    {selected.caseNumber}
                  </p>
                  <h2 className="font-display text-2xl md:text-3xl uppercase tracking-wide text-primary leading-tight">
                    {selected.lastName} {selected.firstName} {selected.middleName}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Дело открыто: {fmtDate(selected.createdAt)}
                  </p>
                </div>
                <div className="md:ml-auto flex gap-2">
                  <Button
                    onClick={() => window.print()}
                    variant="outline"
                    className="rounded-none uppercase tracking-wide gap-2"
                  >
                    <Icon name="FileText" size={16} />
                    PDF
                  </Button>
                  <Button
                    onClick={() => window.print()}
                    className="rounded-none uppercase tracking-wide gap-2"
                  >
                    <Icon name="Sheet" size={16} />
                    Excel
                  </Button>
                </div>
              </div>

              <dl className="divide-y divide-border">
                {[
                  { label: 'Дата рождения', value: fmtDate(selected.birthDate), icon: 'Cake' },
                  { label: 'Адрес регистрации', value: selected.address || '—', icon: 'MapPin' },
                  { label: 'Номер дела', value: selected.caseNumber, icon: 'Hash' },
                  {
                    label: 'Примечания',
                    value: selected.notes || 'Отсутствуют',
                    icon: 'StickyNote',
                  },
                ].map((row) => (
                  <div key={row.label} className="grid grid-cols-12 gap-4 px-6 py-4 items-start">
                    <dt className="col-span-12 md:col-span-4 flex items-center gap-2 text-sm uppercase tracking-wide text-muted-foreground">
                      <Icon name={row.icon} size={16} className="text-accent" />
                      {row.label}
                    </dt>
                    <dd className="col-span-12 md:col-span-8 font-500">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-border mt-12 py-6">
        <div className="container text-center text-xs uppercase tracking-widest text-muted-foreground">
          Электронный архив личных дел · Доступ ограничен
        </div>
      </footer>
    </div>
  );
};

export default Index;
