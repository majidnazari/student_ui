import { createRouter, createWebHistory } from "vue-router";

import DashboardLayout from "../layouts/DashboardLayout.vue";
import DashboardHome from "../pages/DashboardHome.vue";

import CollegesPage from "../pages/CollegesPage.vue";
import EducationGroupsPage from "../pages/EducationGroupsPage.vue";
import MajorsPage from "../pages/MajorsPage.vue";
import LessonsPage from "../pages/LessonsPage.vue";
import StudentsPage from "../pages/StudentsPage.vue";
import TermsPage from "../pages/TermsPage.vue";
import StudentTermResultsPage from "../pages/StudentTermResultsPage.vue";

export default createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: "/",
            component: DashboardLayout,
            children: [
                { path: "", component: DashboardHome },

                { path: "colleges", component: CollegesPage },
                { path: "education-groups", component: EducationGroupsPage },
                { path: "majors", component: MajorsPage },
                { path: "lessons", component: LessonsPage },
                { path: "students", component: StudentsPage },

                { path: "terms", component: TermsPage },
                { path: "term-results", component: StudentTermResultsPage },
            ],
        },
    ],
});