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
  birthPlace: string;
  address: string;
  email: string;
  phone: string;
  inn: string;
  snils: string;
  photo: string;
  caseNumber: string;
  notes: string;
  createdAt: string;
}

const SAMPLE_PHOTO =
  'https://cdn.poehali.dev/projects/7dfa2ad8-8ed8-40b5-8797-26f7d7b88675/bucket/f4c2165f-fc13-4283-96a5-a599daf1669b.png';

const initialData: Citizen[] = [
  {
    id: 1,
    lastName: 'Перец',
    firstName: 'Эдуард',
    middleName: 'Янович',
    birthDate: '1995-07-22',
    birthPlace: 'Закарпатская обл. / Укр.',
    address: '630007, обл. Новосибирская, г. Новосибирск, ул. Сибревкома, д. 9А, кв. 183, этаж 21',
    email: 'peretseduard2207@hotmail.com',
    phone: '+7 (913) 000-22-07',
    inn: '780262975639',
    snils: '21534762755',
    photo: SAMPLE_PHOTO,
    caseNumber: 'ЛД-0001/24',
    notes: 'Личное дело открыто при поступлении на службу.',
    createdAt: '2024-01-15',
  },
  {
    id: 2,
    lastName: 'Соколова',
    firstName: 'Анна',
    middleName: 'Викторовна',
    birthDate: '1990-07-28',
    birthPlace: 'г. Санкт-Петербург',
    address: 'г. Санкт-Петербург, Невский пр., д. 88, кв. 14',
    email: 'a.sokolova@mail.ru',
    phone: '+7 (921) 555-14-88',
    inn: '780100200300',
    snils: '11223344556',
    photo: '',
    caseNumber: 'ЛД-0002/24',
    notes: 'Передано из городского архива.',
    createdAt: '2024-02-03',
  },
];

type Tab = 'list' | 'add' | 'profile';

const emptyForm = {
  lastName: '',
  firstName: '',
  middleName: '',
  birthDate: '',
  birthPlace: '',
  address: '',
  email: '',
  phone: '',
  inn: '',
  snils: '',
  photo: '',
  notes: '',
};

const fmtDate = (d: string) => {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}.${m}.${y}`;
};

const getAge = (d: string) => {
  if (!d) return null;
  const b = new Date(d);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const mo = now.getMonth() - b.getMonth();
  if (mo < 0 || (mo === 0 && now.getDate() < b.getDate())) age--;
  return age;
};

const Index = () => {
  const [tab, setTab] = useState<Tab>('list');
  const [citizens, setCitizens] = useState<Citizen[]>(initialData);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

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

  const handleDelete = (id: number, name: string) => {
    if (!window.confirm(`Удалить личное дело: ${name}?`)) return;
    setCitizens((prev) => prev.filter((c) => c.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
      setTab('list');
    }
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, photo: reader.result as string }));
    reader.readAsDataURL(file);
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
    setForm(emptyForm);
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
                <span className="col-span-2 text-right">Действия</span>
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
                  className={`grid grid-cols-12 gap-4 px-5 py-4 items-center border-b border-border last:border-0 hover:bg-secondary/60 transition-colors ${
                    i % 2 ? 'bg-secondary/20' : ''
                  }`}
                >
                  <span className="col-span-2 font-display font-600 text-primary">
                    {c.caseNumber}
                  </span>
                  <button
                    onClick={() => openProfile(c.id)}
                    className="col-span-5 font-500 text-left hover:text-accent transition-colors"
                  >
                    {c.lastName} {c.firstName} {c.middleName}
                  </button>
                  <span className="col-span-3 text-muted-foreground tabular-nums">
                    {fmtDate(c.birthDate)}
                  </span>
                  <span className="col-span-2 flex justify-end gap-1">
                    <button
                      onClick={() => openProfile(c.id)}
                      title="Открыть"
                      className="p-2 text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
                    >
                      <Icon name="Eye" size={16} />
                    </button>
                    <button
                      onClick={() =>
                        handleDelete(c.id, `${c.lastName} ${c.firstName} ${c.middleName}`)
                      }
                      title="Удалить"
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Icon name="Trash2" size={16} />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ADD */}
        {tab === 'add' && (
          <div className="animate-fade-in max-w-3xl">
            <div className="mb-6 border-l-4 border-accent pl-4">
              <h2 className="font-display text-2xl uppercase tracking-wide text-primary">
                Открытие личного дела
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Заполните сведения о гражданине. Поля со знаком * обязательны.
              </p>
            </div>

            <form onSubmit={handleAdd} className="bg-card border border-border p-6 space-y-6">
              {/* Photo */}
              <div className="flex items-center gap-5">
                <div className="h-28 w-24 border-2 border-border bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                  {form.photo ? (
                    <img src={form.photo} alt="фото" className="h-full w-full object-cover" />
                  ) : (
                    <Icon name="User" size={36} className="text-muted-foreground" />
                  )}
                </div>
                <div>
                  <Label className="uppercase text-xs tracking-widest">Фотография</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handlePhoto}
                    className="rounded-none mt-2 cursor-pointer"
                  />
                </div>
              </div>

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
                  <Label className="uppercase text-xs tracking-widest">Место рождения</Label>
                  <Input
                    value={form.birthPlace}
                    onChange={(e) => setForm({ ...form, birthPlace: e.target.value })}
                    className="rounded-none"
                    placeholder="обл. / страна"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="uppercase text-xs tracking-widest">Место проживания</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="rounded-none"
                  placeholder="индекс, область, город, улица, дом, кв."
                />
              </div>

              <div className="border-t border-border pt-4">
                <p className="font-display uppercase tracking-widest text-sm text-primary mb-4">
                  Данные о гражданине
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="uppercase text-xs tracking-widest">Эл. почта</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="rounded-none"
                      placeholder="mail@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase text-xs tracking-widest">Номер телефона</Label>
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="rounded-none"
                      placeholder="+7 (___) ___-__-__"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase text-xs tracking-widest">ИНН</Label>
                    <Input
                      value={form.inn}
                      onChange={(e) => setForm({ ...form, inn: e.target.value })}
                      className="rounded-none"
                      placeholder="000000000000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase text-xs tracking-widest">СНИЛС</Label>
                    <Input
                      value={form.snils}
                      onChange={(e) => setForm({ ...form, snils: e.target.value })}
                      className="rounded-none"
                      placeholder="00000000000"
                    />
                  </div>
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
                  onClick={() => {
                    setForm(emptyForm);
                    setTab('list');
                  }}
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
              {/* Top: photo + main */}
              <div className="flex flex-col md:flex-row gap-6 border-b border-border p-6 bg-secondary/30">
                <div className="h-44 w-36 border-2 border-primary bg-secondary overflow-hidden shrink-0 flex items-center justify-center">
                  {selected.photo ? (
                    <img
                      src={selected.photo}
                      alt={selected.lastName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Icon name="User" size={56} className="text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-display text-sm uppercase tracking-widest text-accent font-600">
                    {selected.caseNumber}
                  </p>
                  <h2 className="font-display text-2xl md:text-3xl uppercase tracking-wide text-primary leading-tight mb-3">
                    {selected.lastName} {selected.firstName} {selected.middleName}
                  </h2>
                  <div className="space-y-1.5 text-sm">
                    <p>
                      <span className="text-muted-foreground">Дата рождения: </span>
                      <span className="font-500">{fmtDate(selected.birthDate)}</span>
                      {getAge(selected.birthDate) !== null && (
                        <span className="text-muted-foreground"> ({getAge(selected.birthDate)} лет)</span>
                      )}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Место рождения: </span>
                      <span className="font-500">{selected.birthPlace || '—'}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Место проживания: </span>
                      <span className="font-500">{selected.address || '—'}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 border-b border-border p-4">
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
                <Button
                  onClick={() =>
                    handleDelete(
                      selected.id,
                      `${selected.lastName} ${selected.firstName} ${selected.middleName}`
                    )
                  }
                  variant="destructive"
                  className="rounded-none uppercase tracking-wide gap-2 ml-auto"
                >
                  <Icon name="Trash2" size={16} />
                  Удалить дело
                </Button>
              </div>

              {/* Details */}
              <div className="p-6">
                <p className="font-display uppercase tracking-widest text-sm text-primary mb-4">
                  Данные о гражданине
                </p>
                <dl className="divide-y divide-border border border-border">
                  {[
                    {
                      label: 'Эл. почта',
                      value: selected.email || '—',
                      icon: 'Mail',
                      link: selected.email ? `mailto:${selected.email}` : '',
                    },
                    { label: 'Номер телефона', value: selected.phone || '—', icon: 'Phone', link: '' },
                    { label: 'ИНН', value: selected.inn || '—', icon: 'Hash', link: '' },
                    { label: 'СНИЛС', value: selected.snils || '—', icon: 'IdCard', link: '' },
                    {
                      label: 'Примечания',
                      value: selected.notes || 'Отсутствуют',
                      icon: 'StickyNote',
                      link: '',
                    },
                    {
                      label: 'Дело открыто',
                      value: fmtDate(selected.createdAt),
                      icon: 'Calendar',
                      link: '',
                    },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="grid grid-cols-12 gap-4 px-4 py-3 items-start"
                    >
                      <dt className="col-span-12 md:col-span-4 flex items-center gap-2 text-sm uppercase tracking-wide text-muted-foreground">
                        <Icon name={row.icon} size={16} className="text-accent" />
                        {row.label}
                      </dt>
                      <dd className="col-span-12 md:col-span-8 font-500 break-words">
                        {row.link ? (
                          <a href={row.link} className="text-accent hover:underline">
                            {row.value}
                          </a>
                        ) : (
                          row.value
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
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
