<script setup>
import { ref, reactive } from "vue";
import { api } from "../api/resources";

const loading = ref(false);
const error = ref("");

const search = reactive({ student_number: "", first_name: "", last_name: "" });
const students = ref([]);
const selectedStudent = ref(null);
const report = ref(null);

const termForm = reactive({
  open: false,
  mode: "create",
  termId: null,
  term_number: "",
  start_date: "",
  end_date: "",
});

const searchStudents = async () => {
  error.value = "";
  loading.value = true;
  try {
    const res = await api.list("students", { ...search, per_page: 20 });
    students.value = res.data.data || [];
  } catch (e) {
    error.value = "خطا در دریافت دانشجو";
  } finally {
    loading.value = false;
  }
};

const loadStudentReport = async (id) => {
  error.value = "";
  loading.value = true;
  try {
    const res = await api.show("students", id);
    report.value = res.data;
    selectedStudent.value = report.value;
    termForm.open = false;
  } catch (e) {
    error.value = "خطا در دریافت گزارش دانشجو";
  } finally {
    loading.value = false;
  }
};

const openCreate = () => {
  termForm.open = true;
  termForm.mode = "create";
  termForm.termId = null;
  termForm.term_number = "";
  termForm.start_date = "";
  termForm.end_date = "";
};

const openEdit = (t) => {
  termForm.open = true;
  termForm.mode = "edit";
  termForm.termId = t.id;
  termForm.term_number = t.term_number ?? "";
  termForm.start_date = t.start_date ?? "";
  termForm.end_date = t.end_date ?? "";
};

const submit = async () => {
  if (!selectedStudent.value) return;

  error.value = "";
  loading.value = true;
  try {
    const payload = {
      term_number: Number(termForm.term_number),
      start_date: termForm.start_date || null,
      end_date: termForm.end_date || null,
    };

    if (termForm.mode === "create") {
      await api.createTerm(selectedStudent.value.id, payload);
    } else {
      await api.updateTerm(termForm.termId, payload);
    }

    await loadStudentReport(selectedStudent.value.id);
    termForm.open = false;
  } catch (e) {
    error.value = "خطا در ذخیره ترم";
  } finally {
    loading.value = false;
  }
};

const removeTerm = async (id) => {
  if (!confirm("ترم حذف شود؟")) return;

  error.value = "";
  loading.value = true;
  try {
    await api.deleteTerm(id);
    await loadStudentReport(selectedStudent.value.id);
  } catch (e) {
    error.value = "خطا در حذف ترم";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="card">
    <h2>ترم‌ها (CRUD برای هر دانشجو)</h2>

    <div class="grid">
      <input v-model="search.student_number" placeholder="شماره دانشجویی" @input="searchStudents" />
      <input v-model="search.first_name" placeholder="نام" @input="searchStudents" />
      <input v-model="search.last_name" placeholder="نام خانوادگی" @input="searchStudents" />
    </div>

    <div v-if="error" class="error">{{ error }}</div>
    <div v-if="loading" class="muted">در حال دریافت...</div>

    <div class="list" v-if="students.length">
      <div class="item" v-for="s in students" :key="s.id" @click="loadStudentReport(s.id)">
        {{ (s.full_name || (s.first_name+' '+s.last_name)) }} — {{ s.student_number }}
      </div>
    </div>

    <div v-if="report" class="box">
      <div class="head">
        <h3>ترم‌های {{ report.full_name || (report.first_name+' '+report.last_name) }}</h3>
        <button class="btn" @click="openCreate">+ افزودن ترم</button>
      </div>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>شماره ترم</th>
            <th>شروع</th>
            <th>پایان</th>
            <th>عملیات</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in report.terms" :key="t.id">
            <td>{{ t.id }}</td>
            <td>{{ t.term_number }}</td>
            <td>{{ t.start_date }}</td>
            <td>{{ t.end_date }}</td>
            <td>
              <button class="btn small" @click="openEdit(t)">ویرایش</button>
              <button class="btn danger small" @click="removeTerm(t.id)">حذف</button>
            </td>
          </tr>
          <tr v-if="!report.terms || report.terms.length===0">
            <td colspan="5" class="muted" style="text-align:center;">ترمی ثبت نشده</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="termForm.open" class="modal">
      <div class="modal-card">
        <div class="modal-head">
          <h3>{{ termForm.mode==='create'?'افزودن ترم':'ویرایش ترم' }}</h3>
          <button class="x" @click="termForm.open=false">✕</button>
        </div>

        <div class="grid2">
          <div>
            <label>شماره ترم</label>
            <input v-model="termForm.term_number" type="number" min="1" />
          </div>
          <div>
            <label>تاریخ شروع (YYYY-MM-DD)</label>
            <input v-model="termForm.start_date" placeholder="2025-09-23" />
          </div>
          <div>
            <label>تاریخ پایان (YYYY-MM-DD)</label>
            <input v-model="termForm.end_date" placeholder="2026-01-20" />
          </div>
        </div>

        <div class="actions">
          <button class="btn" @click="submit">ذخیره</button>
          <button class="btn secondary" @click="termForm.open=false">انصراف</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card{ background:#fff; border:1px solid #eee; border-radius:12px; padding:16px; }
.grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-top:12px; }
.grid2{ display:grid; grid-template-columns:repeat(2,1fr); gap:12px; }
input{ padding:10px; border:1px solid #ddd; border-radius:10px; }
.list{ margin-top:12px; display:grid; gap:8px; }
.item{ border:1px solid #eee; padding:10px; border-radius:10px; cursor:pointer; }
.item:hover{ background:#fafafa; }
.box{ margin-top:16px; border-top:1px solid #eee; padding-top:12px; }
.head{ display:flex; justify-content:space-between; align-items:center; }
table{ width:100%; border-collapse:collapse; margin-top:10px; }
th,td{ border:1px solid #eee; padding:8px; font-size:13px; }
th{ background:#fafafa; }
.btn{ border:1px solid #ddd; background:#fff; padding:8px 12px; border-radius:10px; cursor:pointer; }
.btn.small{ padding:6px 10px; border-radius:8px; }
.btn.secondary{ background:#fafafa; }
.btn.danger{ border-color:#ffb3b3; }
.error{ color:#b00020; font-weight:700; margin-top:10px; }
.muted{ color:#666; font-size:12px; margin-top:10px; }

.modal{ position:fixed; inset:0; background:rgba(0,0,0,.35); display:grid; place-items:center; padding:16px; }
.modal-card{ width:min(700px,100%); background:#fff; border-radius:12px; padding:16px; }
.modal-head{ display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
.x{ border:0; background:transparent; font-size:18px; cursor:pointer; }
.actions{ display:flex; gap:10px; justify-content:flex-end; margin-top:12px; }
@media(max-width:900px){ .grid,.grid2{ grid-template-columns:1fr; } }
</style>