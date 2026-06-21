import { useState, useEffect, useRef, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { authApi, citizensApi, documentsApi, logsApi } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface User { id: number; username: string; full_name: string; role: string; created_at?: string; }
interface Citizen {
  id: number; last_name: string; first_name: string; middle_name: string;
  birth_date: string; birth_place: string; address: string; email: string;
  phone: string; inn: string; snils: string; photo: string;
  case_number: string; notes: string; archived: boolean; created_at: string;
}
interface DocFile { id: number; name: string; size: number; data: string; uploaded_at: string; }
interface DocRow { id: number; citizen_id: number; fio: string; case_number: string; name: string; size: number; uploaded_at: string; uploaded_by: string; }
interface LogRow { id: number; username: string; action_label: string; details: string; created_at: string; }

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (d: string) => {
  if (!d) return '—';
  const [y, m, day] = d.slice(0, 10).split('-');
  return `${day}.${m}.${y}`;
};
const fmtSize = (b: number) =>
  b < 1024 ? `${b} Б` : b < 1048576 ? `${(b / 1024).toFixed(1)} КБ` : `${(b / 1048576).toFixed(1)} МБ`;
const getAge = (d: string) => {
  if (!d) return null;
  const b = new Date(d), now = new Date();
  let a = now.getFullYear() - b.getFullYear();
  if (now.getMonth() - b.getMonth() < 0 || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) a--;
  return a;
};
const downloadDoc = (doc: DocFile) => {
  const a = document.createElement('a'); a.href = doc.data; a.download = doc.name; a.click();
};

const emptyForm = {
  last_name: '', first_name: '', middle_name: '', birth_date: '',
  birth_place: '', address: '', email: '', phone: '', inn: '', snils: '', photo: '', notes: '',
};

// ─── Login Screen ─────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: (u: User) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await authApi.login(username, password);
      localStorage.setItem('archive_token', res.token);
      onLogin(res.user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка входа');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center font-sans">
      <div className="w-full max-w-sm">
        <div className="bg-primary text-primary-foreground p-8 border-b-4 border-accent">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center border-2 border-accent">
              <Icon name="Landmark" size={22} className="text-accent" />
            </div>
            <div>
              <p className="font-display text-lg uppercase tracking-wide leading-none">Государственный архив</p>
              <p className="text-xs text-primary-foreground/60 uppercase tracking-widest mt-0.5">Личные дела граждан</p>
            </div>
          </div>
        </div>
        <form onSubmit={submit} className="border border-t-0 border-border bg-card p-8 space-y-4">
          <p className="font-display uppercase tracking-widest text-sm text-primary">Вход в систему</p>
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm px-3 py-2 flex items-center gap-2">
              <Icon name="AlertCircle" size={14} /> {error}
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="uppercase text-xs tracking-widest">Логин</Label>
            <Input value={username} onChange={e => setUsername(e.target.value)} className="rounded-none" placeholder="admin" required autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label className="uppercase text-xs tracking-widest">Пароль</Label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="rounded-none" placeholder="••••••••" required />
          </div>
          <Button type="submit" disabled={loading} className="w-full rounded-none uppercase tracking-wide gap-2 mt-2">
            {loading ? <Icon name="Loader2" size={16} className="animate-spin" /> : <Icon name="LogIn" size={16} />}
            {loading ? 'Вход...' : 'Войти'}
          </Button>
          <p className="text-xs text-muted-foreground text-center pt-1">По умолчанию: admin / admin123</p>
        </form>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

type Tab = 'list' | 'add' | 'profile' | 'documents' | 'logs' | 'users';

export default function Index() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [tab, setTab] = useState<Tab>('list');

  const [citizens, setCitizens] = useState<Citizen[]>([]);
  const [citizensLoading, setCitizensLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formLoading, setFormLoading] = useState(false);

  const [profileDocs, setProfileDocs] = useState<DocFile[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docDragging, setDocDragging] = useState(false);
  const docInputRef = useRef<HTMLInputElement>(null);

  const [allDocs, setAllDocs] = useState<DocRow[]>([]);
  const [allDocsLoading, setAllDocsLoading] = useState(false);

  const [logs, setLogs] = useState<LogRow[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [users, setUsers] = useState<User[]>([]);
  const [userForm, setUserForm] = useState({ username: '', password: '', full_name: '', role: 'operator' });
  const [userFormLoading, setUserFormLoading] = useState(false);
  const [userError, setUserError] = useState('');

  const selected = citizens.find(c => c.id === selectedId) || null;

  // Auth check on mount
  useEffect(() => {
    const token = localStorage.getItem('archive_token');
    if (!token) { setAuthChecked(true); return; }
    authApi.me()
      .then(u => { setUser(u); setAuthChecked(true); })
      .catch(() => { localStorage.removeItem('archive_token'); setAuthChecked(true); });
  }, []);

  const loadCitizens = useCallback(async () => {
    setCitizensLoading(true);
    try { setCitizens(await citizensApi.list(search)); } catch { /* ignore */ }
    finally { setCitizensLoading(false); }
  }, [search]);

  useEffect(() => { if (user && tab === 'list') loadCitizens(); }, [user, tab, loadCitizens]);

  const loadProfileDocs = useCallback(async (id: number) => {
    setDocsLoading(true);
    try { setProfileDocs(await documentsApi.byCitizen(id)); } catch { /* ignore */ }
    finally { setDocsLoading(false); }
  }, []);

  useEffect(() => { if (tab === 'profile' && selectedId) loadProfileDocs(selectedId); }, [tab, selectedId, loadProfileDocs]);

  useEffect(() => {
    if (user && tab === 'documents') {
      setAllDocsLoading(true);
      documentsApi.all().then(setAllDocs).catch(() => {}).finally(() => setAllDocsLoading(false));
    }
  }, [user, tab]);

  useEffect(() => {
    if (user && tab === 'logs') {
      setLogsLoading(true);
      logsApi.list().then(setLogs).catch(() => {}).finally(() => setLogsLoading(false));
    }
  }, [user, tab]);

  useEffect(() => {
    if (user?.role === 'admin' && tab === 'users') {
      authApi.getUsers().then(setUsers).catch(() => {});
    }
  }, [user, tab]);

  const handleLogout = async () => {
    await authApi.logout().catch(() => {});
    localStorage.removeItem('archive_token');
    setUser(null); setTab('list'); setCitizens([]);
  };

  const openProfile = (id: number) => { setSelectedId(id); setTab('profile'); };

  const handleArchive = async (id: number) => {
    await citizensApi.toggleArchive(id);
    setCitizens(prev => prev.filter(c => c.id !== id));
    if (selectedId === id) { setSelectedId(null); setTab('list'); }
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, photo: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setFormLoading(true);
    try {
      const c = await citizensApi.create(form);
      setCitizens(prev => [c, ...prev]);
      setForm(emptyForm); setSelectedId(c.id); setTab('profile');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Ошибка');
    } finally { setFormLoading(false); }
  };

  const readDocFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['doc', 'docx', 'pdf'].includes(ext)) { alert('Поддерживаются только .doc, .docx, .pdf'); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const doc = await documentsApi.upload({ citizen_id: selectedId!, name: file.name, size: file.size, data: reader.result as string });
        setProfileDocs(prev => [doc, ...prev]);
      } catch { alert('Ошибка загрузки файла'); }
    };
    reader.readAsDataURL(file);
  };

  const handleDocInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files || []).forEach(readDocFile); e.target.value = '';
  };

  const handleDocRemove = async (docId: number) => {
    if (!window.confirm('Удалить документ?')) return;
    await documentsApi.remove(docId);
    setProfileDocs(prev => prev.filter(d => d.id !== docId));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault(); setUserError(''); setUserFormLoading(true);
    try {
      const u = await authApi.createUser(userForm);
      setUsers(prev => [...prev, u]);
      setUserForm({ username: '', password: '', full_name: '', role: 'operator' });
    } catch (err: unknown) {
      setUserError(err instanceof Error ? err.message : 'Ошибка');
    } finally { setUserFormLoading(false); }
  };

  if (!authChecked) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Icon name="Loader2" size={32} className="animate-spin text-muted-foreground" />
    </div>
  );
  if (!user) return <LoginScreen onLogin={u => setUser(u)} />;

  const tabs: { key: Tab; label: string; icon: string; adminOnly?: boolean }[] = [
    { key: 'list', label: 'Реестр дел', icon: 'Files' },
    { key: 'add', label: 'Новое дело', icon: 'FilePlus2' },
    { key: 'profile', label: 'Карточка', icon: 'UserSquare' },
    { key: 'documents', label: 'Документы', icon: 'Paperclip' },
    { key: 'logs', label: 'Журнал', icon: 'ClipboardList' },
    { key: 'users', label: 'Пользователи', icon: 'Users', adminOnly: true },
  ];

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      {/* Header */}
      <header className="border-b-4 border-accent bg-primary text-primary-foreground">
        <div className="container py-4 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center border-2 border-accent shrink-0">
            <Icon name="Landmark" size={26} className="text-accent" />
          </div>
          <div>
            <h1 className="font-display text-xl md:text-2xl font-600 uppercase tracking-wide leading-none">Государственный архив</h1>
            <p className="text-xs text-primary-foreground/60 mt-0.5 uppercase tracking-widest">Личные дела граждан</p>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <span className="font-display text-2xl font-700 text-accent leading-none">{citizens.length}</span>
              <span className="text-xs uppercase tracking-widest text-primary-foreground/60">дел в реестре</span>
            </div>
            <div className="flex items-center gap-2 border-l border-primary-foreground/20 pl-4">
              <div className="flex h-8 w-8 items-center justify-center bg-accent text-accent-foreground font-display font-700 text-sm">
                {user.full_name[0]}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-500 leading-none">{user.full_name}</p>
                <p className="text-xs text-primary-foreground/50">{user.role === 'admin' ? 'Администратор' : 'Оператор'}</p>
              </div>
              <button onClick={handleLogout} title="Выйти" className="ml-1 p-1.5 text-primary-foreground/60 hover:text-primary-foreground transition-colors">
                <Icon name="LogOut" size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="border-b border-border bg-card overflow-x-auto">
        <div className="container flex min-w-max">
          {tabs.filter(t => !t.adminOnly || user.role === 'admin').map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              disabled={t.key === 'profile' && !selected}
              className={`flex items-center gap-2 px-4 py-3.5 text-xs uppercase tracking-wide font-500 border-b-2 transition-colors whitespace-nowrap disabled:opacity-40 ${tab === t.key ? 'border-accent text-primary' : 'border-transparent text-muted-foreground hover:text-primary'}`}>
              <Icon name={t.icon} size={14} />{t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="container py-6">

        {/* ── РЕЕСТР ── */}
        {tab === 'list' && (
          <div className="animate-fade-in">
            <div className="flex flex-col md:flex-row gap-3 mb-5">
              <div className="relative flex-1 max-w-md">
                <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Поиск по ФИО..." value={search} onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && loadCitizens()} className="pl-9 rounded-none" />
              </div>
              <Button onClick={loadCitizens} variant="outline" className="rounded-none gap-2 uppercase tracking-wide text-xs">
                <Icon name="RefreshCw" size={13} />Обновить
              </Button>
              <Button onClick={() => setTab('add')} className="rounded-none gap-2 uppercase tracking-wide text-xs">
                <Icon name="Plus" size={13} />Добавить дело
              </Button>
            </div>
            <div className="border border-border bg-card">
              <div className="grid grid-cols-12 gap-3 px-4 py-2.5 border-b border-border bg-secondary text-xs uppercase tracking-widest font-600 text-muted-foreground">
                <span className="col-span-2">№ дела</span>
                <span className="col-span-5">Фамилия Имя Отчество</span>
                <span className="col-span-3">Дата рождения</span>
                <span className="col-span-2 text-right">Действия</span>
              </div>
              {citizensLoading && <div className="py-12 text-center"><Icon name="Loader2" size={28} className="mx-auto animate-spin opacity-40" /></div>}
              {!citizensLoading && citizens.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                  <Icon name="FolderSearch" size={36} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Дела не найдены. Добавьте первое дело.</p>
                </div>
              )}
              {citizens.map((c, i) => (
                <div key={c.id} className={`grid grid-cols-12 gap-3 px-4 py-3.5 items-center border-b border-border last:border-0 hover:bg-secondary/50 transition-colors ${i % 2 ? 'bg-secondary/15' : ''}`}>
                  <span className="col-span-2 font-display font-600 text-primary text-sm">{c.case_number}</span>
                  <button onClick={() => openProfile(c.id)} className="col-span-5 font-500 text-left hover:text-accent transition-colors text-sm truncate">
                    {c.last_name} {c.first_name} {c.middle_name}
                  </button>
                  <span className="col-span-3 text-muted-foreground tabular-nums text-sm">{fmtDate(c.birth_date)}</span>
                  <span className="col-span-2 flex justify-end gap-0.5">
                    <button onClick={() => openProfile(c.id)} title="Открыть" className="p-1.5 text-muted-foreground hover:text-primary hover:bg-secondary transition-colors">
                      <Icon name="Eye" size={15} />
                    </button>
                    <button onClick={() => { if (window.confirm(`Архивировать: ${c.last_name} ${c.first_name}?`)) handleArchive(c.id); }}
                      title="Архивировать" className="p-1.5 text-muted-foreground hover:text-amber-600 hover:bg-amber-50 transition-colors">
                      <Icon name="Archive" size={15} />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── НОВОЕ ДЕЛО ── */}
        {tab === 'add' && (
          <div className="animate-fade-in max-w-3xl">
            <div className="mb-5 border-l-4 border-accent pl-4">
              <h2 className="font-display text-xl uppercase tracking-wide text-primary">Открытие личного дела</h2>
              <p className="text-sm text-muted-foreground mt-1">Поля со знаком * обязательны.</p>
            </div>
            <form onSubmit={handleAdd} className="bg-card border border-border p-6 space-y-5">
              <div className="flex items-center gap-4">
                <div className="h-24 w-20 border-2 border-border bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                  {form.photo ? <img src={form.photo} alt="" className="h-full w-full object-cover" /> : <Icon name="User" size={30} className="text-muted-foreground" />}
                </div>
                <div>
                  <Label className="uppercase text-xs tracking-widest">Фотография</Label>
                  <Input type="file" accept="image/*" onChange={handlePhoto} className="rounded-none mt-1.5 cursor-pointer text-sm" />
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                {([['last_name','Фамилия *',true],['first_name','Имя *',true],['middle_name','Отчество',false]] as [string,string,boolean][]).map(([k,l,r]) => (
                  <div key={k} className="space-y-1.5">
                    <Label className="uppercase text-xs tracking-widest">{l}</Label>
                    <Input required={r} value={form[k as keyof typeof form]} onChange={e => setForm({...form,[k]:e.target.value})} className="rounded-none" />
                  </div>
                ))}
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="uppercase text-xs tracking-widest">Дата рождения *</Label>
                  <Input required type="date" value={form.birth_date} onChange={e => setForm({...form,birth_date:e.target.value})} className="rounded-none" />
                </div>
                <div className="space-y-1.5">
                  <Label className="uppercase text-xs tracking-widest">Место рождения</Label>
                  <Input value={form.birth_place} onChange={e => setForm({...form,birth_place:e.target.value})} className="rounded-none" placeholder="обл. / страна" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="uppercase text-xs tracking-widest">Место проживания</Label>
                <Input value={form.address} onChange={e => setForm({...form,address:e.target.value})} className="rounded-none" placeholder="индекс, область, город, улица, дом, кв." />
              </div>
              <div className="border-t border-border pt-4">
                <p className="font-display uppercase tracking-widest text-xs text-primary mb-3">Контактные данные</p>
                <div className="grid md:grid-cols-2 gap-3">
                  {([['email','Эл. почта','email','mail@example.com'],['phone','Телефон','text','+7 (___) ___-__-__'],['inn','ИНН','text','000000000000'],['snils','СНИЛС','text','00000000000']] as [string,string,string,string][]).map(([k,l,t,p]) => (
                    <div key={k} className="space-y-1.5">
                      <Label className="uppercase text-xs tracking-widest">{l}</Label>
                      <Input type={t} value={form[k as keyof typeof form]} onChange={e => setForm({...form,[k]:e.target.value})} className="rounded-none" placeholder={p} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="uppercase text-xs tracking-widest">Примечания</Label>
                <Textarea value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} className="rounded-none min-h-20" />
              </div>
              <div className="flex gap-3 pt-1">
                <Button type="submit" disabled={formLoading} className="rounded-none uppercase tracking-wide gap-2 text-xs">
                  {formLoading ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Save" size={14} />}
                  {formLoading ? 'Сохранение...' : 'Зарегистрировать дело'}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setForm(emptyForm); setTab('list'); }} className="rounded-none uppercase tracking-wide text-xs">Отмена</Button>
              </div>
            </form>
          </div>
        )}

        {/* ── КАРТОЧКА ── */}
        {tab === 'profile' && selected && (
          <div className="animate-fade-in max-w-3xl">
            <button onClick={() => setTab('list')} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary mb-4 uppercase tracking-wide">
              <Icon name="ArrowLeft" size={14} />К реестру
            </button>
            <div className="bg-card border border-border">
              <div className="flex flex-col md:flex-row gap-5 border-b border-border p-5 bg-secondary/30">
                <div className="h-40 w-32 border-2 border-primary bg-secondary overflow-hidden shrink-0 flex items-center justify-center">
                  {selected.photo ? <img src={selected.photo} alt="" className="h-full w-full object-cover" /> : <Icon name="User" size={48} className="text-muted-foreground" />}
                </div>
                <div className="flex-1">
                  <p className="font-display text-xs uppercase tracking-widest text-accent font-600">{selected.case_number}</p>
                  <h2 className="font-display text-2xl uppercase tracking-wide text-primary leading-tight mb-3">
                    {selected.last_name} {selected.first_name} {selected.middle_name}
                  </h2>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Дата рождения: </span><span className="font-500">{fmtDate(selected.birth_date)}</span>{getAge(selected.birth_date) !== null && <span className="text-muted-foreground"> ({getAge(selected.birth_date)} лет)</span>}</p>
                    <p><span className="text-muted-foreground">Место рождения: </span><span className="font-500">{selected.birth_place || '—'}</span></p>
                    <p><span className="text-muted-foreground">Место проживания: </span><span className="font-500">{selected.address || '—'}</span></p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 border-b border-border p-3">
                <Button onClick={() => window.print()} variant="outline" className="rounded-none uppercase tracking-wide gap-2 text-xs">
                  <Icon name="FileText" size={13} />PDF
                </Button>
                <Button onClick={() => { if (window.confirm('Архивировать дело?')) handleArchive(selected.id); }}
                  variant="outline" className="rounded-none uppercase tracking-wide gap-2 text-xs ml-auto border-amber-300 text-amber-700 hover:bg-amber-50">
                  <Icon name="Archive" size={13} />Архивировать
                </Button>
              </div>
              <div className="p-5 border-b border-border">
                <p className="font-display uppercase tracking-widest text-xs text-primary mb-3">Данные о гражданине</p>
                <dl className="divide-y divide-border border border-border">
                  {[
                    {l:'Эл. почта', v:selected.email||'—', icon:'Mail', href:selected.email?`mailto:${selected.email}`:''},
                    {l:'Телефон', v:selected.phone||'—', icon:'Phone', href:''},
                    {l:'ИНН', v:selected.inn||'—', icon:'Hash', href:''},
                    {l:'СНИЛС', v:selected.snils||'—', icon:'IdCard', href:''},
                    {l:'Примечания', v:selected.notes||'Отсутствуют', icon:'StickyNote', href:''},
                    {l:'Дело открыто', v:fmtDate(selected.created_at), icon:'Calendar', href:''},
                  ].map(row => (
                    <div key={row.l} className="grid grid-cols-12 gap-3 px-3 py-2.5 items-start">
                      <dt className="col-span-12 md:col-span-4 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                        <Icon name={row.icon} size={13} className="text-accent" />{row.l}
                      </dt>
                      <dd className="col-span-12 md:col-span-8 text-sm font-500 break-words">
                        {row.href ? <a href={row.href} className="text-accent hover:underline">{row.v}</a> : row.v}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
              {/* Документы */}
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-display uppercase tracking-widest text-xs text-primary">
                    Документы <span className="text-accent font-sans normal-case tracking-normal">({profileDocs.length})</span>
                  </p>
                  <Button type="button" variant="outline" size="sm" onClick={() => docInputRef.current?.click()} className="rounded-none uppercase tracking-wide gap-1.5 text-xs">
                    <Icon name="Upload" size={13} />Загрузить
                  </Button>
                  <input ref={docInputRef} type="file" accept=".doc,.docx,.pdf" multiple className="hidden" onChange={handleDocInput} />
                </div>
                <div onDragOver={e => { e.preventDefault(); setDocDragging(true); }} onDragLeave={() => setDocDragging(false)}
                  onDrop={e => { e.preventDefault(); setDocDragging(false); Array.from(e.dataTransfer.files).forEach(readDocFile); }}
                  onClick={() => docInputRef.current?.click()}
                  className={`border-2 border-dashed p-4 text-center cursor-pointer transition-colors mb-3 ${docDragging ? 'border-accent bg-accent/5' : 'border-border hover:border-primary/40 hover:bg-secondary/20'}`}>
                  <Icon name="FileUp" size={22} className="mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Перетащите или <span className="text-accent underline">выберите файл</span></p>
                  <p className="text-xs text-muted-foreground/50 mt-0.5">.doc .docx .pdf</p>
                </div>
                {docsLoading
                  ? <div className="py-6 text-center"><Icon name="Loader2" size={22} className="mx-auto animate-spin text-muted-foreground" /></div>
                  : profileDocs.length === 0
                    ? <p className="text-sm text-muted-foreground text-center py-3">Документы не прикреплены</p>
                    : (
                      <div className="border border-border divide-y divide-border">
                        {profileDocs.map(doc => {
                          const ext = doc.name.split('.').pop()?.toLowerCase() || '';
                          return (
                            <div key={doc.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-secondary/30 transition-colors">
                              <div className={`flex h-8 w-8 items-center justify-center shrink-0 ${['doc','docx'].includes(ext) ? 'bg-blue-600' : 'bg-red-600'}`}>
                                <Icon name="FileText" size={15} className="text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-500 truncate">{doc.name}</p>
                                <p className="text-xs text-muted-foreground">{fmtSize(doc.size)} · {fmtDate(doc.uploaded_at)}</p>
                              </div>
                              <button onClick={() => downloadDoc(doc)} title="Скачать" className="p-1.5 text-muted-foreground hover:text-primary transition-colors"><Icon name="Download" size={15} /></button>
                              <button onClick={() => handleDocRemove(doc.id)} title="Удалить" className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"><Icon name="X" size={15} /></button>
                            </div>
                          );
                        })}
                      </div>
                    )}
              </div>
            </div>
          </div>
        )}

        {/* ── ДОКУМЕНТЫ ── */}
        {tab === 'documents' && (
          <div className="animate-fade-in">
            <div className="mb-5 border-l-4 border-accent pl-4">
              <h2 className="font-display text-xl uppercase tracking-wide text-primary">Реестр документов</h2>
              <p className="text-sm text-muted-foreground mt-1">Все прикреплённые документы по всем делам.</p>
            </div>
            <div className="border border-border bg-card">
              <div className="grid grid-cols-12 gap-3 px-4 py-2.5 border-b border-border bg-secondary text-xs uppercase tracking-widest font-600 text-muted-foreground">
                <span className="col-span-2">№ дела</span>
                <span className="col-span-3">Гражданин</span>
                <span className="col-span-4">Файл</span>
                <span className="col-span-1">Размер</span>
                <span className="col-span-2">Загружен</span>
              </div>
              {allDocsLoading && <div className="py-12 text-center"><Icon name="Loader2" size={28} className="mx-auto animate-spin text-muted-foreground" /></div>}
              {!allDocsLoading && allDocs.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                  <Icon name="Paperclip" size={36} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Документы отсутствуют</p>
                </div>
              )}
              {allDocs.map((d, i) => (
                <div key={d.id} className={`grid grid-cols-12 gap-3 px-4 py-3 items-center border-b border-border last:border-0 hover:bg-secondary/40 transition-colors ${i%2?'bg-secondary/15':''}`}>
                  <span className="col-span-2 font-display font-600 text-primary text-xs">{d.case_number}</span>
                  <span className="col-span-3 text-sm font-500 truncate">{d.fio}</span>
                  <div className="col-span-4 flex items-center gap-2 min-w-0">
                    <div className={`flex h-6 w-6 items-center justify-center shrink-0 ${d.name.endsWith('.pdf') ? 'bg-red-600' : 'bg-blue-600'}`}>
                      <Icon name="FileText" size={12} className="text-white" />
                    </div>
                    <span className="text-sm truncate">{d.name}</span>
                  </div>
                  <span className="col-span-1 text-xs text-muted-foreground">{fmtSize(d.size)}</span>
                  <span className="col-span-2 text-xs text-muted-foreground tabular-nums">{fmtDate(d.uploaded_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ЖУРНАЛ ── */}
        {tab === 'logs' && (
          <div className="animate-fade-in">
            <div className="mb-5 border-l-4 border-accent pl-4">
              <h2 className="font-display text-xl uppercase tracking-wide text-primary">Журнал действий</h2>
              <p className="text-sm text-muted-foreground mt-1">История всех операций в системе.</p>
            </div>
            <div className="border border-border bg-card">
              <div className="grid grid-cols-12 gap-3 px-4 py-2.5 border-b border-border bg-secondary text-xs uppercase tracking-widest font-600 text-muted-foreground">
                <span className="col-span-3">Дата и время</span>
                <span className="col-span-2">Пользователь</span>
                <span className="col-span-3">Действие</span>
                <span className="col-span-4">Подробности</span>
              </div>
              {logsLoading && <div className="py-12 text-center"><Icon name="Loader2" size={28} className="mx-auto animate-spin text-muted-foreground" /></div>}
              {!logsLoading && logs.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                  <Icon name="ClipboardList" size={36} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Журнал пуст</p>
                </div>
              )}
              {logs.map((l, i) => (
                <div key={l.id} className={`grid grid-cols-12 gap-3 px-4 py-3 items-start border-b border-border last:border-0 ${i%2?'bg-secondary/15':''}`}>
                  <span className="col-span-3 text-xs text-muted-foreground tabular-nums">{l.created_at.slice(0,16).replace('T',' ')}</span>
                  <span className="col-span-2 text-sm font-500">{l.username}</span>
                  <span className="col-span-3 text-sm">{l.action_label}</span>
                  <span className="col-span-4 text-sm text-muted-foreground">{l.details || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ПОЛЬЗОВАТЕЛИ ── */}
        {tab === 'users' && user.role === 'admin' && (
          <div className="animate-fade-in max-w-3xl">
            <div className="mb-5 border-l-4 border-accent pl-4">
              <h2 className="font-display text-xl uppercase tracking-wide text-primary">Пользователи системы</h2>
            </div>
            <div className="border border-border bg-card mb-6">
              <div className="grid grid-cols-12 gap-3 px-4 py-2.5 border-b border-border bg-secondary text-xs uppercase tracking-widest font-600 text-muted-foreground">
                <span className="col-span-3">Логин</span>
                <span className="col-span-4">Полное имя</span>
                <span className="col-span-3">Роль</span>
                <span className="col-span-2">Создан</span>
              </div>
              {users.map((u, i) => (
                <div key={u.id} className={`grid grid-cols-12 gap-3 px-4 py-3 items-center border-b border-border last:border-0 ${i%2?'bg-secondary/15':''}`}>
                  <span className="col-span-3 font-display font-600 text-primary text-sm">{u.username}</span>
                  <span className="col-span-4 text-sm">{u.full_name}</span>
                  <span className="col-span-3">
                    <span className={`text-xs px-2 py-0.5 uppercase tracking-wide font-600 ${u.role==='admin'?'bg-accent/20 text-foreground':'bg-secondary text-muted-foreground'}`}>
                      {u.role === 'admin' ? 'Администратор' : 'Оператор'}
                    </span>
                  </span>
                  <span className="col-span-2 text-xs text-muted-foreground">{u.created_at?.slice(0,10)}</span>
                </div>
              ))}
            </div>
            <div className="border-l-4 border-accent pl-4 mb-4">
              <h3 className="font-display text-base uppercase tracking-wide text-primary">Добавить пользователя</h3>
            </div>
            <form onSubmit={handleCreateUser} className="bg-card border border-border p-5 space-y-4">
              {userError && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm px-3 py-2 flex items-center gap-2">
                  <Icon name="AlertCircle" size={14} />{userError}
                </div>
              )}
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="uppercase text-xs tracking-widest">Полное имя *</Label>
                  <Input required value={userForm.full_name} onChange={e => setUserForm({...userForm,full_name:e.target.value})} className="rounded-none" placeholder="Иванов Иван Иванович" />
                </div>
                <div className="space-y-1.5">
                  <Label className="uppercase text-xs tracking-widest">Логин *</Label>
                  <Input required value={userForm.username} onChange={e => setUserForm({...userForm,username:e.target.value})} className="rounded-none" placeholder="ivanov" />
                </div>
                <div className="space-y-1.5">
                  <Label className="uppercase text-xs tracking-widest">Пароль *</Label>
                  <Input required type="password" value={userForm.password} onChange={e => setUserForm({...userForm,password:e.target.value})} className="rounded-none" placeholder="••••••••" />
                </div>
                <div className="space-y-1.5">
                  <Label className="uppercase text-xs tracking-widest">Роль</Label>
                  <select value={userForm.role} onChange={e => setUserForm({...userForm,role:e.target.value})}
                    className="w-full h-9 border border-input bg-card px-3 text-sm rounded-none focus:outline-none focus:ring-1 focus:ring-ring">
                    <option value="operator">Оператор</option>
                    <option value="admin">Администратор</option>
                  </select>
                </div>
              </div>
              <Button type="submit" disabled={userFormLoading} className="rounded-none uppercase tracking-wide gap-2 text-xs">
                {userFormLoading ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="UserPlus" size={14} />}
                {userFormLoading ? 'Сохранение...' : 'Добавить пользователя'}
              </Button>
            </form>
          </div>
        )}
      </main>

      <footer className="border-t border-border mt-10 py-4">
        <div className="container text-center text-xs uppercase tracking-widest text-muted-foreground">
          Электронный архив личных дел · Доступ ограничен
        </div>
      </footer>
    </div>
  );
}
