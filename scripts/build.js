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
  "data/mockData.js",
  "components/shared/Icons.jsx",
  "components/shared/Header.jsx",
  "components/shared/Notifications.jsx",
  "components/shared/SearchPanel.jsx",
  "components/shared/ProfileMenu.jsx",
  "components/shared/ChangePassword.jsx",
  "components/Login/auth.js",
  "components/Login/api.js",
  "components/Login/Login.jsx",
  "components/Login/AdminServices.jsx",
  "components/Login/AdminAudit.jsx",
  "components/Login/AdminCollege.jsx",
  "components/Login/AdminMenu.jsx",
  "components/Login/AdminGroups.jsx",
  "components/Login/AccountManagement.jsx",
  "components/Login/Register.jsx",
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
  "components/teacher/TeacherDocuments.jsx",
  "components/teacher/TeachingScreen.jsx",
  "components/teacher/TeacherJournal.jsx",
  "components/teacher/TeacherSchedule.jsx",
  "components/teacher/TeacherPairSheet.jsx",
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

// The academy's emblem, shown still in the middle of the screen until the app is ready (it matches the iOS launch images).
const BOOT_EMBLEM = "data:image/jpeg;base64," + fs.readFileSync(path.join(__dirname, "..", "img", "boot-emblem.jpg")).toString("base64");

const head = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8"/>
<style>html{background:#F2F5FA}html[data-theme=dark]{background:#0B1120}</style>
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover"/>
<title>АТТ Академия</title>
<link rel="manifest" href="./manifest.json"/>
<link rel="icon" href="./favicon-32.png" sizes="32x32" type="image/png"/>
<link rel="icon" href="./favicon-16.png" sizes="16x16" type="image/png"/>
<link rel="apple-touch-icon" href="./apple-touch-icon.png"/>
<meta name="apple-mobile-web-app-capable" content="yes"/>
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
<meta name="apple-mobile-web-app-title" content="АТТ"/>
<link rel="apple-touch-startup-image" href="./splash/1206x2622.png" media="(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"/>
<link rel="apple-touch-startup-image" href="./splash/1320x2868.png" media="(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"/>
<link rel="apple-touch-startup-image" href="./splash/1179x2556.png" media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"/>
<link rel="apple-touch-startup-image" href="./splash/1290x2796.png" media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"/>
<link rel="apple-touch-startup-image" href="./splash/1170x2532.png" media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"/>
<link rel="apple-touch-startup-image" href="./splash/1284x2778.png" media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"/>
<link rel="apple-touch-startup-image" href="./splash/1125x2436.png" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"/>
<link rel="apple-touch-startup-image" href="./splash/1242x2688.png" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"/>
<link rel="apple-touch-startup-image" href="./splash/828x1792.png" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"/>
<link rel="apple-touch-startup-image" href="./splash/750x1334.png" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"/>
<meta name="theme-color" content="#0A2A72"/>
<script>try{var t=JSON.parse(localStorage.getItem("att_theme"));document.documentElement.setAttribute("data-theme",t==="dark"?"dark":"light");var m=document.querySelector('meta[name=theme-color]');if(m)m.content=t==="dark"?"#0B1120":"#0A2A72"}catch(e){document.documentElement.setAttribute("data-theme","light")}</script>
<style>#boot{position:fixed;inset:0;z-index:9999;background:#F2F5FA;transition:opacity .2s ease}
[data-theme=dark] #boot{background:#0B1120}
#boot img{position:absolute;left:50%;top:47%;width:120px;height:120px;border-radius:50%;transform:translate(-50%,-50%)}
#boot.gone{opacity:0;pointer-events:none}</style>
</head>
<body><div id="boot"><img src="${BOOT_EMBLEM}" alt="АТТ"/></div><div id="root"></div>
<script src="./vendor/react.production.min.js"></script>
<script src="./vendor/react-dom.production.min.js"></script>
<script>
const { useState, useEffect, useRef } = React;
`;

const foot = `
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
</script></body></html>`;

const out = head + result.code + foot;
fs.writeFileSync(OUT_FILE, out, "utf-8");
console.log(`Build OK: ${OUT_FILE} (${out.length} bytes, ${MANIFEST.length} source files)`);
