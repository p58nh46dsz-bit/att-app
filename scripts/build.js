#!/usr/bin/env node
/**
 * Concatenates the split src/ files (plain global function/const declarations,
 * no import/export) in a dependency-safe order, compiles the result with
 * @babel/core (JSX + modern syntax -> plain JS), and wraps it into the final
 * index.html served by GitHub Pages.
 *
 * Order rules: a file may only be placed before another file if nothing at
 * its OWN module top level (outside a function body) reads a const that the
 * other file declares. Component functions may reference anything from any
 * other file regardless of order, since function bodies only run later
 * (after the whole script has executed once and every const is defined).
 */
const fs = require("fs");
const path = require("path");
const babel = require("@babel/core");

const SRC_ROOT = path.join(__dirname, "..", "src");
const OUT_FILE = path.join(__dirname, "..", "index.html");

const MANIFEST = [
  "components/shared/constants.js",
  "components/shared/Icons.jsx",
  "components/shared/Header.jsx",
  "components/shared/Notifications.jsx",
  "components/shared/SearchPanel.jsx",
  "components/shared/ProfileMenu.jsx",
  "components/Login/Login.jsx",
  "components/student/StudentDashboard.jsx",
  "components/student/Schedule.jsx",
  "components/student/Grades.jsx",
  "components/student/Portfolio.jsx",
  "components/student/Curriculum.jsx",
  "components/student/Consultations.jsx",
  "components/student/Certificates.jsx",
  "components/student/Electives.jsx",
  "components/applicant/ApplicantMain.jsx",
  "components/applicant/ApplicantFAQ.jsx",
  "components/applicant/ApplicationForm.jsx",
  "components/applicant/Specialties.jsx",
  "components/applicant/AdmissionsCommittee.jsx",
  "components/applicant/AboutAcademy.jsx",
  "components/applicant/OpenDay.jsx",
  "components/teacher/TeacherProfile.jsx",
  "components/teacher/TeacherGradeModal.jsx",
  "components/teacher/GroupModal.jsx",
  "components/teacher/TeacherMessageModal.jsx",
  "components/teacher/TeacherMaterialsModal.jsx",
  "App.jsx",
];

const parts = MANIFEST.map(rel => {
  const full = path.join(SRC_ROOT, rel);
  if (!fs.existsSync(full)) throw new Error(`Missing file in manifest: ${rel}`);
  return fs.readFileSync(full, "utf-8").replace(/^﻿/, "");
});

const concatenated = parts.join("\n\n");

const result = babel.transformSync(concatenated, {
  presets: [
    ["@babel/preset-env", { targets: "defaults", modules: false }],
    ["@babel/preset-react", {}],
  ],
  filename: "app.jsx",
});

const head = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
<title>АТТ Академия</title>
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
</head>
<body><div id="root"></div>
<script>
const { useState, useEffect, useRef } = React;
`;

const foot = `
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
</script></body></html>`;

const out = head + result.code + foot;
fs.writeFileSync(OUT_FILE, out, "utf-8");
console.log(`Build OK: ${OUT_FILE} (${out.length} bytes, ${MANIFEST.length} source files)`);
