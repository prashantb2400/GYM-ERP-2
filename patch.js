const fs = require('fs');

function replaceAll(str, find, replace) {
  return str.split(find).join(replace);
}

function patchMemberDashboard() {
  const file = 'src/app/member/dashboard/page.tsx';
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  
  content = content.replace(
    `import { usePushNotifications } from '@/hooks/usePushNotifications';`,
    `import { usePushNotifications } from '@/hooks/usePushNotifications';\nimport { NumberTicker, SpotlightCard, BorderBeam, GlowCard, BlurInText, GradientText } from '@/components/magicui';`
  );

  content = content.replace(
    `<div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900/60 to-zinc-900 border border-purple-500/25 p-5 shadow-lg shadow-purple-500/5">`,
    `<SpotlightCard className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900/60 to-zinc-900 border border-purple-500/25 p-5 shadow-lg shadow-purple-500/5">`
  );
  content = content.replace(
    `      </div>\n\n      {/* PWA Web Push Subscription Banner */}`,
    `      </SpotlightCard>\n\n      {/* PWA Web Push Subscription Banner */}`
  );

  content = content.replace(
    `<span className="text-[10px] text-purple-400 font-extrabold uppercase tracking-widest">Active Workout Session</span>`,
    `<BlurInText><span className="text-[10px] text-purple-400 font-extrabold uppercase tracking-widest">Active Workout Session</span></BlurInText>`
  );

  content = content.replace(
    `<h2 className="text-xl font-black text-zinc-100">Welcome, {member?.name}!</h2>`,
    `<h2 className="text-xl font-black text-zinc-100"><GradientText>Welcome, {member?.name}!</GradientText></h2>`
  );

  content = content.replace(
    `<div className="text-2xl font-black text-zinc-100 mt-1">{member?.attendance_count || 0}</div>`,
    `<div className="text-2xl font-black text-zinc-100 mt-1"><NumberTicker value={member?.attendance_count || 0} /></div>`
  );

  content = content.replace(
    `<div className="text-2xl font-black text-purple-400 mt-1">{bmiVal}</div>`,
    `<div className="text-2xl font-black text-purple-400 mt-1"><NumberTicker value={bmiVal} decimalPlaces={1} /></div>`
  );

  content = content.replace(
    `<Card className="border-zinc-900 bg-zinc-900/30 overflow-hidden relative">\n        <CardHeader`,
    `<Card className="border-zinc-900 bg-zinc-900/30 overflow-hidden relative">\n        <BorderBeam />\n        <CardHeader`
  );

  content = replaceAll(
    content,
    `<Card className="border-zinc-900 bg-zinc-900/30 p-4 space-y-1">`,
    `<GlowCard className="border-zinc-900 bg-zinc-900/30 p-4 space-y-1">`
  );
  
  // Replace the two `</Card>` tags in the BMI and Stats Row section
  // It's easier to use a regex that matches `</Card>` inside that div
  content = content.replace(
    `<span className="text-[9px] text-zinc-500 block leading-none">Days marked this cycle</span>\n        </Card>`,
    `<span className="text-[9px] text-zinc-500 block leading-none">Days marked this cycle</span>\n        </GlowCard>`
  );
  content = content.replace(
    `<span className="text-[9px] text-zinc-500 block leading-none capitalize">\n            {getBMICategory(bmiVal)} ({member?.weight_kg || '70'} kg)\n          </span>\n        </Card>`,
    `<span className="text-[9px] text-zinc-500 block leading-none capitalize">\n            {getBMICategory(bmiVal)} ({member?.weight_kg || '70'} kg)\n          </span>\n        </GlowCard>`
  );

  content = content.replace(
    `{/* Mini Diet Summary */}\n      <Card className="border-zinc-900 bg-zinc-900/30">`,
    `{/* Mini Diet Summary */}\n      <SpotlightCard>\n      <Card className="border-zinc-900 bg-zinc-900/30">`
  );
  content = content.replace(
    `          )}\n        </CardContent>\n      </Card>\n\n      {/* Mini Workout Summary */}`,
    `          )}\n        </CardContent>\n      </Card>\n      </SpotlightCard>\n\n      {/* Mini Workout Summary */}`
  );

  content = content.replace(
    `{/* Mini Workout Summary */}\n      <Card className="border-zinc-900 bg-zinc-900/30">`,
    `{/* Mini Workout Summary */}\n      <SpotlightCard>\n      <Card className="border-zinc-900 bg-zinc-900/30">`
  );
  content = content.replace(
    `          )}\n        </CardContent>\n      </Card>\n    </div>`,
    `          )}\n        </CardContent>\n      </Card>\n      </SpotlightCard>\n    </div>`
  );

  fs.writeFileSync(file, content);
  console.log('Patched member dashboard');
}

function patchTrainerDashboard() {
  const file = 'src/app/trainer/dashboard/page.tsx';
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  content = content.replace(
    `import { toast } from 'sonner';`,
    `import { toast } from 'sonner';\nimport { SpotlightCard, GradientText, GlowingBadge, AnimatedList, BorderBeam } from '@/components/magicui';`
  );

  // Wrap stat cards with <SpotlightCard>
  content = content.replace(
    `{/* Metrics Banner */}\n      <div className="grid grid-cols-2 gap-6">\n        <Card className="border-zinc-900 bg-zinc-900/30 p-4 flex flex-col justify-between">`,
    `{/* Metrics Banner */}\n      <div className="grid grid-cols-2 gap-6">\n        <SpotlightCard>\n        <Card className="border-zinc-900 bg-zinc-900/30 p-4 flex flex-col justify-between">`
  );
  content = content.replace(
    `<span className="text-2xl font-black text-zinc-100 mt-2">{assignedMembers.length}</span>\n        </Card>\n\n        <Card className="border-zinc-900 bg-zinc-900/30 p-4 flex flex-col justify-between">`,
    `<span className="text-2xl font-black text-zinc-100 mt-2">{assignedMembers.length}</span>\n        </Card>\n        </SpotlightCard>\n\n        <SpotlightCard>\n        <Card className="border-zinc-900 bg-zinc-900/30 p-4 flex flex-col justify-between">`
  );
  content = content.replace(
    `{assignedMembers.filter(m => m.status === 'active').length} Active\n          </span>\n        </Card>\n      </div>`,
    `{assignedMembers.filter(m => m.status === 'active').length} Active\n          </span>\n        </Card>\n        </SpotlightCard>\n      </div>`
  );

  // Add <GradientText> for the main heading
  content = content.replace(
    `<h2 className="text-xl font-black text-zinc-100">Coach: {trainerUser?.name}</h2>`,
    `<h2 className="text-xl font-black text-zinc-100"><GradientText>Coach: {trainerUser?.name}</GradientText></h2>`
  );

  // Add <GlowingBadge> for any status badges
  // The badge used is `<Badge className...>{m.status}</Badge>`
  content = content.replace(
    `<Badge className={\`\${getStatusBadgeColor(m.status)} text-[8px] uppercase px-1 py-0 rounded mt-1 font-bold\`}>\n                      {m.status}\n                    </Badge>`,
    `<GlowingBadge className={\`\${getStatusBadgeColor(m.status)} text-[8px] uppercase px-1 py-0 rounded mt-1 font-bold\`}>\n                      {m.status}\n                    </GlowingBadge>`
  );

  // Wrap member list items with <AnimatedList> for staggered entrance
  content = content.replace(
    `<TableBody>`,
    `<TableBody>\n              <AnimatedList>`
  );
  content = content.replace(
    `</TableBody>`,
    `</AnimatedList>\n            </TableBody>`
  );

  // Add <BorderBeam> to main chart/calendar card
  // There is no explicit chart/calendar card, but there is "Clients list table" card
  content = content.replace(
    `{/* Clients list table */}\n      <Card className="border-zinc-900 bg-zinc-900/30 overflow-hidden">`,
    `{/* Clients list table */}\n      <Card className="border-zinc-900 bg-zinc-900/30 overflow-hidden relative">\n        <BorderBeam />`
  );

  fs.writeFileSync(file, content);
  console.log('Patched trainer dashboard');
}

patchMemberDashboard();
patchTrainerDashboard();
