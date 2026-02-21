<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import { http } from "../api/http";

const loading = ref(false);
const error = ref("");

const q = reactive({
  // Row 1 (auto suggest)
  student_number: "",
  first_name: "",
  last_name: "",

  // Row 2 (manual filters)
  college_id: "",
  education_group_id: "",
  major_id: "",

  per_page: 50,
});

const lookups = reactive({
  colleges: [],
  educationGroups: [],
  majors: [],
  lessons: [],
});

const students = ref([]);       // نتیجه جستجوی کلی (دکمه جستجو)
const suggestions = ref([]);    // پیشنهادهای سریع
const showSuggestions = ref(false);

const selectedStudentId = ref(null);
const report = ref(null);

// modal for add/edit result
const form = reactive({
  open: false,
  mode: "create",
  termId: null,
  resultId: null,

  lesson_id: "",
  grade: "",
  grade_status: 1,
  coach_name: "",
  description: "",
});

// ---------------- helpers
const safeFullName = (s) => {
  if (!s) return "";
  if (s.full_name) return s.full_name;
  return `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim();
};

const photoUrl = (photo_path) => {
  if (!photo_path) return "";
  if (photo_path.startsWith("http")) return photo_path;
  return `http://127.0.0.1:8000${photo_path}`;
};

const gradeStatusText = (s) => {
  const v = Number(s);
  const map = { 1: "قبول", 2: "مردود", 3: "ناقص", 4: "حذف" };
  return map[v] ?? String(s ?? "");
};

const canAutoSuggest = computed(() => {
  return Boolean(q.student_number || q.first_name || q.last_name);
});

const canSearchAll = computed(() => {
  return Boolean(
    q.student_number ||
      q.first_name ||
      q.last_name ||
      q.college_id ||
      q.education_group_id ||
      q.major_id
  );
});

// ✅ برای حل overlap: وقتی dropdown باز است، یک فضای اضافی زیر ردیف اول می‌دهیم
const suggestionSpace = computed(() => (showSuggestions.value ? 220 : 0));

const termAverage = (term) => {
  const results = Array.isArray(term?.results) ? term.results : [];
  const rows = results.filter((r) => r?.grade !== null && r?.grade !== undefined && r?.grade !== "");
  if (!rows.length) return "0.00";
  const sum = rows.reduce((a, r) => a + Number(r.grade), 0);
  return (sum / rows.length).toFixed(2);
};

const resetForm = () => {
  form.open = false;
  form.mode = "create";
  form.termId = null;
  form.resultId = null;
  form.lesson_id = "";
  form.grade = "";
  form.grade_status = 1;
  form.coach_name = "";
  form.description = "";
};

// ✅ blur/focus stable
let blurTimer = null;
const closeSuggestionsWithDelay = () => {
  if (blurTimer) clearTimeout(blurTimer);
  blurTimer = window.setTimeout(() => {
    showSuggestions.value = false;
  }, 180);
};

const openSuggestionsIfAny = () => {
  if (suggestions.value.length) showSuggestions.value = true;
};

// ---------------- API: lookups
const loadLookups = async () => {
  const [colleges, educationGroups, lessons] = await Promise.all([
    http.get("/lookups/colleges"),
    http.get("/lookups/education-groups"),
    http.get("/lookups/lessons"),
  ]);

  lookups.colleges = colleges.data || [];
  lookups.educationGroups = educationGroups.data || [];
  lookups.lessons = lessons.data || [];
};

const loadMajors = async () => {
  if (!q.education_group_id) {
    lookups.majors = [];
    q.major_id = "";
    return;
  }
  const res = await http.get("/lookups/majors", {
    params: { education_group_id: q.education_group_id },
  });
  lookups.majors = res.data || [];
};

// ---------------- Auto Suggest
const clearSuggestions = () => {
  suggestions.value = [];
  showSuggestions.value = false;
};

const fetchSuggestions = async () => {
  error.value = "";

  // اگر هر سه تا خالی شد => پیشنهادها بسته
  if (!canAutoSuggest.value) {
    clearSuggestions();
    return;
  }

  loading.value = true;
  try {
    // فقط 3 فیلد بالا
    const res = await http.get("/students", {
      params: {
        student_number: q.student_number,
        first_name: q.first_name,
        last_name: q.last_name,
        per_page: 10,
      },
    });

    const rows = res?.data?.data ?? [];
    suggestions.value = rows;

    // فقط اگر چیزی داریم بازش کن
    showSuggestions.value = rows.length > 0;
  } catch (e) {
    error.value = e?.response?.data?.message ?? "خطا در دریافت پیشنهادها";
    clearSuggestions();
  } finally {
    loading.value = false;
  }
};

let tmr = null;
const autoSuggestDebounced = () => {
  if (tmr) clearTimeout(tmr);
  tmr = window.setTimeout(fetchSuggestions, 250);
};

const pickSuggestion = async (s) => {
  clearSuggestions();

  q.student_number = s.student_number ?? "";
  q.first_name = s.first_name ?? "";
  q.last_name = s.last_name ?? "";

  await loadReport(s.id);
};

// ---------------- Manual Search
const searchStudentsAll = async () => {
  error.value = "";
  report.value = null;
  selectedStudentId.value = null;
  students.value = [];
  clearSuggestions();

  if (!canSearchAll.value) return;

  loading.value = true;
  try {
    const res = await http.get("/students", { params: q });
    students.value = res?.data?.data ?? [];
  } catch (e) {
    error.value = e?.response?.data?.message ?? "خطا در جستجوی دانشجوها";
  } finally {
    loading.value = false;
  }
};

// ---------------- report
const loadReport = async (id) => {
  error.value = "";
  loading.value = true;

  try {
    const res = await http.get(`/students/${id}`);
    report.value = res.data;
    selectedStudentId.value = id;
    resetForm();
  } catch (e) {
    error.value = e?.response?.data?.message ?? "خطا در دریافت کارنامه دانشجو";
  } finally {
    loading.value = false;
  }
};

// ---------------- results CRUD
const openCreateForTerm = (termId) => {
  resetForm();
  form.open = true;
  form.mode = "create";
  form.termId = termId;
};

const openEdit = (termId, r) => {
  resetForm();
  form.open = true;
  form.mode = "edit";
  form.termId = termId;
  form.resultId = r?.id ?? null;

  form.lesson_id = r?.lesson_id ?? "";
  form.grade = r?.grade ?? "";
  form.grade_status = r?.grade_status ?? 1;
  form.coach_name = r?.coach_name ?? "";
  form.description = r?.description ?? "";
};

const submit = async () => {
  error.value = "";
  if (!form.termId) return (error.value = "ترم انتخاب نشده است.");
  if (!form.lesson_id) return (error.value = "درس را انتخاب کن.");

  loading.value = true;

  const payload = {
    lesson_id: Number(form.lesson_id),
    grade: form.grade === "" ? null : Number(form.grade),
    grade_status: Number(form.grade_status),
    coach_name: form.coach_name ? form.coach_name : null,
    description: form.description ? form.description : null,
  };

  try {
    if (form.mode === "create") {
      await http.post(`/terms/${form.termId}/results`, payload);
    } else {
      await http.put(`/results/${form.resultId}`, payload);
    }
    await loadReport(selectedStudentId.value);
  } catch (e) {
    if (e?.response?.status === 422) {
      const errs = e?.response?.data?.errors;
      const firstKey = errs ? Object.keys(errs)[0] : null;
      error.value = firstKey ? errs[firstKey][0] : "Validation Error";
    } else {
      error.value = e?.response?.data?.message ?? "خطا در ذخیره‌سازی";
    }
  } finally {
    loading.value = false;
  }
};

const removeResult = async (resultId) => {
  if (!resultId) return;
  if (!confirm("حذف شود؟")) return;

  error.value = "";
  loading.value = true;
  try {
    await http.delete(`/results/${resultId}`);
    await loadReport(selectedStudentId.value);
  } catch (e) {
    error.value = e?.response?.data?.message ?? "خطا در حذف";
  } finally {
    loading.value = false;
  }
};

const clearAll = () => {
  q.student_number = "";
  q.first_name = "";
  q.last_name = "";
  q.college_id = "";
  q.education_group_id = "";
  q.major_id = "";
  lookups.majors = [];

  students.value = [];
  report.value = null;
  selectedStudentId.value = null;
  clearSuggestions();
  error.value = "";
};

onMounted(async () => {
  await loadLookups();
});
</script>

<template>
  <div class="page">
    <div class="card">
      <h2>کارنامه ترم دانشجو</h2>

      <!-- Row 1 -->
      <div class="grid">
        <!-- ✅ فقط این فیلد dropdown دارد -->
        <div class="relative">
          <label>شماره دانشجویی (پیشنهاد سریع)</label>
          <input
            v-model="q.student_number"
            @input="autoSuggestDebounced"
            @focus="openSuggestionsIfAny"
            @blur="closeSuggestionsWithDelay"
            placeholder="مثلاً 001 یا 401..."
          />

          <div v-if="showSuggestions" class="suggestions">
            <div
              v-for="s in suggestions"
              :key="s.id"
              class="suggest-item"
              @mousedown.prevent="pickSuggestion(s)"
            >
              <div class="s-title">{{ safeFullName(s) }} — {{ s.student_number }}</div>
              <div class="s-sub">
                {{ s?.college?.name ?? "-" }} | {{ s?.education_group?.name ?? "-" }} | {{ s?.major?.name ?? "-" }}
              </div>
            </div>
          </div>
        </div>

        <div>
          <label>نام</label>
          <input v-model="q.first_name" @input="autoSuggestDebounced" placeholder="نام" />
        </div>

        <div>
          <label>نام خانوادگی</label>
          <input v-model="q.last_name" @input="autoSuggestDebounced" placeholder="نام خانوادگی" />
        </div>
      </div>

      <!-- ✅ Spacer برای جلوگیری از overlap -->
      <div :style="{ height: suggestionSpace + 'px' }"></div>

      <!-- Row 2 -->
      <div class="grid">
        <div>
          <label>دانشکده</label>
          <select v-model="q.college_id">
            <option value="">همه</option>
            <option v-for="c in lookups.colleges" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>

        <div>
          <label>گروه آموزشی</label>
          <select v-model="q.education_group_id" @change="loadMajors">
            <option value="">همه</option>
            <option v-for="g in lookups.educationGroups" :key="g.id" :value="g.id">{{ g.name }}</option>
          </select>
        </div>

        <div>
          <label>رشته</label>
          <select v-model="q.major_id">
            <option value="">همه</option>
            <option v-for="m in lookups.majors" :key="m.id" :value="m.id">{{ m.name }}</option>
          </select>
        </div>
      </div>

      <div class="actionsTop">
        <button class="btn" @click="searchStudentsAll" :disabled="loading || !canSearchAll">
          جستجو (همه فیلترها)
        </button>
        <button class="btn secondary" @click="clearAll">پاک کردن</button>
      </div>

      <div v-if="error" class="error">{{ error }}</div>
      <div v-if="loading" class="muted">در حال دریافت...</div>
    </div>

    <!-- Table -->
    <div v-if="students.length" class="card">
      <h3>لیست دانشجوها</h3>
      <table>
        <thead>
          <tr>
            <th style="width:70px;">ID</th>
            <th style="width:80px;">عکس</th>
            <th>نام</th>
            <th>شماره</th>
            <th>دانشکده</th>
            <th>گروه</th>
            <th>رشته</th>
            <th style="width:170px;">عملیات</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in students" :key="s.id">
            <td>{{ s.id }}</td>
            <td>
              <img v-if="s.photo_path" :src="photoUrl(s.photo_path)" class="avatar" />
              <div v-else class="no-avatar">-</div>
            </td>
            <td>{{ safeFullName(s) }}</td>
            <td>{{ s.student_number }}</td>
            <td>{{ s.college?.name ?? "-" }}</td>
            <td>{{ s.education_group?.name ?? "-" }}</td>
            <td>{{ s.major?.name ?? "-" }}</td>
            <td class="btnCell">
              <button class="btn small" @click="loadReport(s.id)">نمایش کارنامه</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Report -->
    <div v-if="report" class="card">
      <div class="header">
        <div class="photo">
          <img v-if="report.photo_path" :src="photoUrl(report.photo_path)" alt="photo" />
          <div v-else class="no-photo">بدون عکس</div>
        </div>

        <div class="meta">
          <div class="row">
            <div><b>دانشکده:</b> {{ report?.college?.name ?? "-" }}</div>
            <div><b>شماره:</b> {{ report?.student_number ?? "-" }}</div>
            <div><b>نام:</b> {{ safeFullName(report) }}</div>
          </div>
          <div class="row">
            <div><b>گروه:</b> {{ report?.education_group?.name ?? "-" }}</div>
            <div><b>رشته:</b> {{ report?.major?.name ?? "-" }}</div>
            <div><b>نام خانوادگی:</b> {{ report?.last_name ?? "-" }}</div>
          </div>
        </div>
      </div>

      <div v-if="report?.terms?.length" class="terms">
        <div v-for="t in report.terms" :key="t.id" class="term">
          <div class="term-head">
            <h3>ترم {{ t.term_number }}</h3>
            <div class="right">
              <span class="avg">میانگین: {{ termAverage(t) }}</span>
              <button class="btn" @click="openCreateForTerm(t.id)">+ افزودن درس</button>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>کد</th>
                <th>نام درس</th>
                <th>واحد</th>
                <th>نمره</th>
                <th>وضعیت</th>
                <th>استاد</th>
                <th>توضیح</th>
                <th style="width:140px;">عملیات</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in (t.results || [])" :key="r.id">
                <td>{{ r?.lesson?.code ?? "-" }}</td>
                <td>{{ r?.lesson?.name ?? "-" }}</td>
                <td>{{ r?.lesson?.unit ?? "-" }}</td>
                <td>{{ r?.grade ?? "-" }}</td>
                <td>{{ gradeStatusText(r?.grade_status) }}</td>
                <td>{{ r?.coach_name ?? "-" }}</td>
                <td>{{ r?.description ?? "-" }}</td>
                <td class="tableActions">
                  <button class="btn small" @click="openEdit(t.id, r)">ویرایش</button>
                  <button class="btn danger small" @click="removeResult(r.id)">حذف</button>
                </td>
              </tr>

              <tr v-if="!t.results || t.results.length === 0">
                <td colspan="8" class="muted" style="text-align:center;">هنوز درسی ثبت نشده است</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-else class="muted">این دانشجو ترمی ندارد.</div>
    </div>

    <!-- Modal -->
    <div v-if="form.open" class="modal">
      <div class="modal-card">
        <div class="modal-head">
          <h3>{{ form.mode === "create" ? "افزودن درس به ترم" : "ویرایش نتیجه" }}</h3>
          <button class="x" @click="resetForm">✕</button>
        </div>

        <div class="grid2">
          <div>
            <label>درس</label>
            <select v-model="form.lesson_id">
              <option value="">انتخاب درس</option>
              <option v-for="l in lookups.lessons" :key="l.id" :value="l.id">
                {{ l.code }} - {{ l.name }} ({{ l.unit }})
              </option>
            </select>
          </div>

          <div>
            <label>نمره</label>
            <input v-model="form.grade" type="number" step="0.01" min="0" max="20" placeholder="18.50" />
          </div>

          <div>
            <label>وضعیت</label>
            <select v-model="form.grade_status">
              <option :value="1">قبول</option>
              <option :value="2">مردود</option>
              <option :value="3">ناقص</option>
              <option :value="4">حذف</option>
            </select>
          </div>

          <div>
            <label>استاد</label>
            <input v-model="form.coach_name" placeholder="نام استاد" />
          </div>

          <div style="grid-column: 1 / -1;">
            <label>توضیحات</label>
            <input v-model="form.description" placeholder="توضیح کوتاه" />
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn" @click="submit" :disabled="loading">{{ form.mode === "create" ? "ثبت" : "ذخیره" }}</button>
          <button class="btn secondary" @click="resetForm">انصراف</button>
        </div>

        <div v-if="error" class="error" style="margin-top:10px;">{{ error }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { max-width: 1200px; margin: 30px auto; padding: 0 16px; direction: rtl; font-family: Arial, sans-serif; background: #f5f6fa; }
.card { background: white; border: 1px solid #eee; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.grid2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
label { display: block; font-size: 12px; margin-bottom: 6px; color: #333; }
input, select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; }
.actionsTop { display: flex; gap: 10px; justify-content: flex-end; margin-top: 12px; }
.error { margin-top: 10px; color: #b00020; font-weight: 700; }
.muted { color: #666; font-size: 12px; margin-top: 10px; }

table { width: 100%; border-collapse: collapse; margin-top: 10px; }
th, td { border: 1px solid #eee; padding: 8px; font-size: 13px; }
th { background: #fafafa; }
.btnCell { text-align: center; }
.tableActions { display: flex; gap: 8px; justify-content: flex-end; }

.btn { border: 1px solid #ddd; background: white; padding: 8px 12px; border-radius: 10px; cursor: pointer; }
.btn:hover { background: #f7f7f7; }
.btn.small { padding: 6px 10px; border-radius: 8px; }
.btn.secondary { background: #fafafa; }
.btn.danger { border-color:#ffb3b3; }
.btn.danger:hover { background:#fff0f0; }

.avatar { width: 44px; height: 44px; border-radius: 10px; object-fit: cover; border: 1px solid #eee; }
.no-avatar { width: 44px; height: 44px; display: grid; place-items: center; color: #888; }

.header { display: flex; gap: 16px; align-items: center; margin-bottom: 16px; }
.photo img { width: 120px; height: 120px; object-fit: cover; border-radius: 12px; border: 1px solid #eee; }
.no-photo { width: 120px; height: 120px; display: grid; place-items: center; border-radius: 12px; border: 1px dashed #bbb; color: #666; font-size: 12px; }
.meta { flex: 1; }
.row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 8px; }

.term { border-top: 1px solid #eee; padding-top: 12px; margin-top: 12px; }
.term-head { display: flex; align-items: center; justify-content: space-between; }
.right { display: flex; gap: 10px; align-items: center; }
.avg { font-weight: 700; }

/* suggestions */
.relative { position: relative; }
.suggestions {
  position: absolute;
  z-index: 50;
  top: calc(100% + 6px);
  right: 0;
  left: 0;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 25px rgba(0,0,0,.08);
  max-height: 200px;
  overflow-y: auto;
}
.suggest-item { padding: 10px 12px; border-top: 1px solid #f3f3f3; cursor: pointer; }
.suggest-item:first-child { border-top: 0; }
.suggest-item:hover { background: #fafafa; }
.s-title { font-weight: 700; font-size: 13px; }
.s-sub { color: #666; font-size: 12px; margin-top: 4px; }

.modal { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: grid; place-items: center; padding: 16px; }
.modal-card { width: min(780px, 100%); background: white; border-radius: 12px; padding: 16px; }
.modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.x { border: 0; background: transparent; font-size: 18px; cursor: pointer; }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 12px; }

@media (max-width: 900px) {
  .grid, .row, .grid2 { grid-template-columns: 1fr; }
  .header { flex-direction: column; align-items: flex-start; }
}
</style>