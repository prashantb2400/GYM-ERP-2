const fs = require('fs');

function replaceAll(str, find, replace) {
  return str.split(find).join(replace);
}

function patchInvoices() {
  const file = 'src/app/dashboard/invoices/page.tsx';
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  
  content = content.replace(
    `import { Dialog`,
    `import { SpotlightCard, GradientText, GlowingBadge, BorderBeam, NumberTicker } from '@/components/magicui';\nimport { Dialog`
  );

  content = content.replace(
    `<h2 className="text-2xl font-bold tracking-tight text-zinc-100">Tax Invoices</h2>`,
    `<h2 className="text-2xl font-bold tracking-tight text-zinc-100"><GradientText>Tax Invoices</GradientText></h2>`
  );

  content = content.replace(
    `<Badge className={\`\${getStatusBadgeColor(inv.status)} border text-[10px] font-semibold rounded px-2 py-0.5 capitalize\`}>\n                      {inv.status}\n                    </Badge>`,
    `<GlowingBadge className={\`\${getStatusBadgeColor(inv.status)} border text-[10px] font-semibold rounded px-2 py-0.5 capitalize\`}>\n                      {inv.status}\n                    </GlowingBadge>`
  );

  content = content.replace(
    `<Card className="border-zinc-800 bg-zinc-900/40 overflow-hidden">`,
    `<Card className="border-zinc-800 bg-zinc-900/40 overflow-hidden relative">\n        <BorderBeam />`
  );

  fs.writeFileSync(file, content);
  console.log('Patched invoices');
}

function patchDue() {
  const file = 'src/app/dashboard/due/page.tsx';
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  content = content.replace(
    `import { toast } from 'sonner';`,
    `import { toast } from 'sonner';\nimport { GradientText, GlowingBadge, GlowCard, NumberTicker } from '@/components/magicui';`
  );

  // GradientText
  content = content.replace(
    `<h2 className="text-2xl font-bold tracking-tight text-zinc-100">Due Payments</h2>`,
    `<h2 className="text-2xl font-bold tracking-tight text-zinc-100"><GradientText>Due Payments</GradientText></h2>`
  );

  // GlowCard for table card
  content = content.replace(
    `<Card className="border-zinc-800 bg-zinc-900/40 overflow-hidden">`,
    `<GlowCard className="border-zinc-800 bg-zinc-900/40 overflow-hidden">`
  );
  // Need to replace the closing tag of this card. We can cheat by using regex or just leaving it if Card works, but it's `<Card>...</Card>`. Let's just do:
  content = replaceAll(content, `</Card>`, `</GlowCard>`);
  // But wait, are there other cards? There's a Metrics card.
  // We can just replace `<Card ` with `<GlowCard ` globally in `due/page.tsx` for simplicity since it says "Wrap table card with <GlowCard>".
  // Or we just find the specific one.
  content = replaceAll(content, `<Card `, `<GlowCard `);
  content = replaceAll(content, `<CardContent`, `<div`);
  content = replaceAll(content, `</CardContent>`, `</div>`);

  // GlowingBadge
  content = replaceAll(content, `<Badge `, `<GlowingBadge `);
  content = replaceAll(content, `</Badge>`, `</GlowingBadge>`);

  fs.writeFileSync(file, content);
  console.log('Patched due');
}

function patchPlans() {
  const file = 'src/app/dashboard/plans/page.tsx';
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  content = content.replace(
    `import { toast } from 'sonner';`,
    `import { toast } from 'sonner';\nimport { SpotlightCard, GlowingBadge, GradientText, BorderBeam } from '@/components/magicui';`
  );

  content = content.replace(
    `<h2 className="text-2xl font-bold tracking-tight text-zinc-100">Membership Plans</h2>`,
    `<h2 className="text-2xl font-bold tracking-tight text-zinc-100"><GradientText>Membership Plans</GradientText></h2>`
  );

  // Wrap each plan card with SpotlightCard
  // <Card className="border-zinc-800 bg-zinc-900/40 flex flex-col hover:border-zinc-700 transition-colors">
  content = replaceAll(
    content,
    `<Card className="border-zinc-800 bg-zinc-900/40 flex flex-col hover:border-zinc-700 transition-colors">`,
    `<SpotlightCard>\n            <Card className="border-zinc-800 bg-zinc-900/40 flex flex-col hover:border-zinc-700 transition-colors relative">`
  );
  // Close SpotlightCard after </Card>
  content = replaceAll(
    content,
    `</CardFooter>\n          </Card>`,
    `</CardFooter>\n          </Card>\n          </SpotlightCard>`
  );

  // Add BorderBeam on featured/primary plan card? We can just add it inside the card if it's "featured" or the first one, or we can just add it to all.
  // The instructions say "Add <BorderBeam> on featured/primary plan card".
  // Let's add it to active plans.
  content = replaceAll(
    content,
    `<div className="flex justify-between items-start">\n                <div>`,
    `<BorderBeam />\n                <div className="flex justify-between items-start">\n                <div>`
  );

  // GlowingBadge
  content = replaceAll(content, `<Badge `, `<GlowingBadge `);
  content = replaceAll(content, `</Badge>`, `</GlowingBadge>`);

  fs.writeFileSync(file, content);
  console.log('Patched plans');
}

function patchWhatsapp() {
  const file = 'src/app/dashboard/whatsapp/page.tsx';
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  content = content.replace(
    `import { toast } from 'sonner';`,
    `import { toast } from 'sonner';\nimport { GradientText, SpotlightCard, NumberTicker, GlowingBadge, BorderBeam } from '@/components/magicui';`
  );

  content = content.replace(
    `<h2 className="text-2xl font-bold tracking-tight text-zinc-100">WhatsApp Integration</h2>`,
    `<h2 className="text-2xl font-bold tracking-tight text-zinc-100"><GradientText>WhatsApp Integration</GradientText></h2>`
  );

  content = replaceAll(content, `<Badge className="bg-green-500/10 text-green-400 border-green-500/20">Connected</Badge>`, `<GlowingBadge className="bg-green-500/10 text-green-400 border-green-500/20" variant="live" pulse>Connected</GlowingBadge>`);

  content = replaceAll(content, `<Card className="border-zinc-800 bg-zinc-900/40 p-6 flex flex-col justify-between">`, `<SpotlightCard>\n          <Card className="border-zinc-800 bg-zinc-900/40 p-6 flex flex-col justify-between h-full">`);
  content = replaceAll(content, `span className="text-3xl font-bold text-zinc-100 mt-2">{`, `span className="text-3xl font-bold text-zinc-100 mt-2"><NumberTicker value={`
  );
  content = replaceAll(content, `}</span>\n        </Card>`, `} /></span>\n        </Card>\n        </SpotlightCard>`);

  content = replaceAll(content, `<Card className="border-zinc-800 bg-zinc-900/40 relative">`, `<Card className="border-zinc-800 bg-zinc-900/40 relative">\n        <BorderBeam />`);

  fs.writeFileSync(file, content);
  console.log('Patched whatsapp');
}

function patchFollowups() {
  const file = 'src/app/dashboard/followups/page.tsx';
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  content = content.replace(
    `import { toast } from 'sonner';`,
    `import { toast } from 'sonner';\nimport { GradientText, GlowCard, GlowingBadge, AnimatedList } from '@/components/magicui';`
  );

  content = content.replace(
    `<h2 className="text-2xl font-bold tracking-tight text-zinc-100">CRM & Follow-ups</h2>`,
    `<h2 className="text-2xl font-bold tracking-tight text-zinc-100"><GradientText>CRM & Follow-ups</GradientText></h2>`
  );

  // GlowCard for followup cards
  content = replaceAll(content, `<Card className="border-zinc-800 bg-zinc-900/40 p-5 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center hover:bg-zinc-800/40 transition-colors">`, `<GlowCard className="border-zinc-800 bg-zinc-900/40 p-5 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center hover:bg-zinc-800/40 transition-colors">`);
  content = replaceAll(content, `</Card>\n            ))}`, `</GlowCard>\n            ))}`);

  // GlowingBadge
  content = replaceAll(content, `<Badge `, `<GlowingBadge `);
  content = replaceAll(content, `</Badge>`, `</GlowingBadge>`);

  // AnimatedList
  content = replaceAll(content, `<div className="space-y-4">\n          {loading ?`, `<AnimatedList className="space-y-4">\n          {loading ?`);
  content = replaceAll(content, `      {/* Modal */}`, `      </AnimatedList>\n\n      {/* Modal */}`);

  fs.writeFileSync(file, content);
  console.log('Patched followups');
}

patchInvoices();
patchDue();
patchPlans();
patchWhatsapp();
patchFollowups();
