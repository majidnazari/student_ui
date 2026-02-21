<script setup>
import { reactive, ref, computed, watch } from "vue";
import { api } from "../api/resources";

const props = defineProps({
  title: String,
  resource: String, // e.g. 'colleges'
  fields: Array,    // [{key:'name', label:'نام', type:'text'}]
  listParams: Object, // optional
});

const loading = ref(false);
const error = ref("");

const items = ref([]);
const q = ref(""); // search client-side (ساده)

const form = reactive({
  open: false,
  mode: "create",
  id: null,
  data: {},
});

const filtered = computed(() => {
  if (!q.value) return items.value;
  const s = q.value.toLowerCase();
  return items.value.filter((it) => JSON.stringify(it).toLowerCase().includes(s));
});

const openCreate = () => {
  form.open = true;
  form.mode = "create";
  form.id = null;
  form.data = Object.fromEntries(props.fields.map(f => [f.key, ""]));
};

const openEdit = (row) => {
  form.open = true;
  form.mode = "edit";
  form.id = row.id;
  const d = {};
  props.fields.forEach(f => d[f.key] = row[f.key] ?? "");
  form.data = d;
};

const close = () => {
  form.open = false;
  form.mode = "create";
  form.id = null;
  form.data = {};
};

const load = async () => {
  error.value = "";
  loading.value = true;
  try {
    const res = await api.list(props.resource, props.listParams || {});
    // اگر pagination بود -> res.data.data
    items.value = Array.isArray(res.data?.data) ? res.data.data : (res.data || []);
  } catch (e) {
    error.value = e?.response?.data?.message ?? "خطا در دریافت لیست";
  } finally {
    loading.value = false;
  }
};

const submit = async () => {
  error.value = "";
  loading.value = true;
  try {
    if (form.mode === "create") {
      await api.create(props.resource, form.data);
    } else {
      await api.update(props.resource, form.id, form.data);
    }
    await load();
    close();
  } catch (e) {
    if (e?.response?.status === 422) {
      const errs = e?.response?.data?.errors;
      const k = errs ? Object.keys(errs)[0] : null;
      error.value = k ? errs[k][0] : "Validation Error";
    } else {
      error.value = e?.response?.data?.message ?? "خطا در ذخیره";
    }
  } finally {
    loading.value = false;
  }
};

const removeRow = async (id) => {
  if (!confirm("حذف شود؟")) return;
  error.value = "";
  loading.value = true;
  try {
    await api.remove(props.resource, id);
    await load();
  } catch (e) {
    error.value = e?.response?.data?.message ?? "خطا در حذف";
  } finally {
    loading.value = false;
  }
};

load();
</script>

<template>
  <div class="card">
    <div class="head">
      <h2>{{ title }}</h2>
      <button class="btn" @click="openCreate">+ افزودن</button>
    </div>

    <div class="tools">
      <input v-model="q" placeholder="جستجو..." />
      <button class="btn secondary" @click="load">ریفریش</button>
    </div>

    <div v-if="error" class="error">{{ error }}</div>
    <div v-if="loading" class="muted">در حال دریافت...</div>

    <table>
      <thead>
        <tr>
          <th style="width:70px;">ID</th>
          <th v-for="f in fields" :key="f.key">{{ f.label }}</th>
          <th style="width:160px;">عملیات</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in filtered" :key="row.id">
          <td>{{ row.id }}</td>
          <td v-for="f in fields" :key="f.key">{{ row[f.key] }}</td>
          <td class="actions">
            <button class="btn small" @click="openEdit(row)">ویرایش</button>
            <button class="btn danger small" @click="removeRow(row.id)">حذف</button>
          </td>
        </tr>
        <tr v-if="filtered.length === 0">
          <td :colspan="fields.length + 2" class="muted" style="text-align:center;">موردی وجود ندارد</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div v-if="form.open" class="modal">
    <div class="modal-card">
      <div class="modal-head">
        <h3>{{ form.mode === 'create' ? 'ایجاد' : 'ویرایش' }}</h3>
        <button class="x" @click="close">✕</button>
      </div>

      <div class="grid">
        <div v-for="f in fields" :key="f.key">
          <label>{{ f.label }}</label>
          <input v-model="form.data[f.key]" :type="f.type || 'text'" />
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn" @click="submit" :disabled="loading">ذخیره</button>
        <button class="btn secondary" @click="close">انصراف</button>
      </div>

      <div v-if="error" class="error" style="margin-top:10px;">{{ error }}</div>
    </div>
  </div>
</template>

<style scoped>
.card { background:#fff; border:1px solid #eee; border-radius:12px; padding:16px; }
.head { display:flex; justify-content:space-between; align-items:center; }
.tools { display:flex; gap:10px; margin:12px 0; }
input { width: 280px; max-width: 100%; padding:10px; border:1px solid #ddd; border-radius:10px; }
table { width:100%; border-collapse:collapse; }
th,td { border:1px solid #eee; padding:8px; font-size:13px; }
th { background:#fafafa; }
.actions { display:flex; gap:8px; justify-content:flex-end; }
.btn { border:1px solid #ddd; background:#fff; padding:8px 12px; border-radius:10px; cursor:pointer; }
.btn:hover { background:#f7f7f7; }
.btn.small { padding:6px 10px; border-radius:8px; }
.btn.secondary { background:#fafafa; }
.btn.danger { border-color:#ffb3b3; }
.btn.danger:hover { background:#fff0f0; }
.muted { color:#666; font-size:12px; }
.error { color:#b00020; font-weight:700; margin-top:10px; }

.modal{ position:fixed; inset:0; background:rgba(0,0,0,.35); display:grid; place-items:center; padding:16px; }
.modal-card{ width:min(700px,100%); background:#fff; border-radius:12px; padding:16px; }
.modal-head{ display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
.x{ border:0; background:transparent; font-size:18px; cursor:pointer; }
.grid{ display:grid; grid-template-columns:repeat(2,1fr); gap:12px; }
label{ display:block; font-size:12px; margin-bottom:6px; }
.modal-actions{ display:flex; gap:10px; justify-content:flex-end; margin-top:12px; }
@media(max-width:900px){ .grid{ grid-template-columns:1fr; } }
</style>