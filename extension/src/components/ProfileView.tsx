// ─────────────────────────────────────────────
//  ApplyOnce AI – Profile View & Edit
// ─────────────────────────────────────────────
import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Mail, Phone, MapPin, Globe, Github, Linkedin,
  Briefcase, GraduationCap, Code, Award, Edit3, Save, X, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { UserProfile } from "@/types";

interface ProfileViewProps {
  profile: UserProfile;
  onSave: (profile: UserProfile) => Promise<void>;
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const Section: React.FC<SectionProps> = ({ title, icon, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-secondary/50 transition-colors"
        id={`section-toggle-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <div className="flex items-center gap-2">
          <span className="text-primary">{icon}</span>
          <span className="text-xs font-semibold text-foreground">{title}</span>
        </div>
        {open ? (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 border-t border-border">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface FieldRowProps {
  label: string;
  icon?: React.ReactNode;
  editing: boolean;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
}

const FieldRow: React.FC<FieldRowProps> = ({
  label, icon, editing, value, onChange, multiline, placeholder,
}) => (
  <div className="mt-2.5">
    <label className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
      {icon && <span className="w-3 h-3">{icon}</span>}
      {label}
    </label>
    {editing ? (
      multiline ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? label}
          className="text-xs min-h-[56px]"
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? label}
          className="text-xs"
        />
      )
    ) : (
      <p className="text-xs text-foreground break-words">
        {value || <span className="text-muted-foreground/50 italic">Not provided</span>}
      </p>
    )}
  </div>
);

export const ProfileView: React.FC<ProfileViewProps> = ({ profile, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [local, setLocal] = useState<UserProfile>(profile);

  const updatePersonal = useCallback(
    (key: keyof typeof profile.personalInfo, val: string) => {
      setLocal((p) => ({
        ...p,
        personalInfo: { ...p.personalInfo, [key]: val },
      }));
    },
    []
  );

  const updateSkills = useCallback((val: string) => {
    setLocal((p) => ({
      ...p,
      skills: val.split(",").map((s) => s.trim()).filter(Boolean),
    }));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(local);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }, [local, onSave]);

  const handleCancel = useCallback(() => {
    setLocal(profile);
    setEditing(false);
  }, [profile]);

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-foreground">
            {profile.personalInfo.name || "Your Profile"}
          </p>
          <p className="text-xs text-muted-foreground">
            {profile.personalInfo.email}
          </p>
        </div>
        {editing ? (
          <div className="flex gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              disabled={saving}
              id="cancel-edit-btn"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              id="save-profile-btn"
            >
              {saving ? (
                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Save
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
            id="edit-profile-btn"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit
          </Button>
        )}
      </div>

      <Separator />

      {/* Personal Info */}
      <Section
        title="Personal Info"
        icon={<User className="w-3.5 h-3.5" />}
        defaultOpen
      >
        <FieldRow
          label="Full Name"
          icon={<User className="w-3 h-3" />}
          editing={editing}
          value={local.personalInfo.name}
          onChange={(v) => updatePersonal("name", v)}
        />
        <FieldRow
          label="Email"
          icon={<Mail className="w-3 h-3" />}
          editing={editing}
          value={local.personalInfo.email}
          onChange={(v) => updatePersonal("email", v)}
        />
        <FieldRow
          label="Phone"
          icon={<Phone className="w-3 h-3" />}
          editing={editing}
          value={local.personalInfo.phone}
          onChange={(v) => updatePersonal("phone", v)}
        />
        <FieldRow
          label="Location"
          icon={<MapPin className="w-3 h-3" />}
          editing={editing}
          value={local.personalInfo.location ?? ""}
          onChange={(v) => updatePersonal("location", v)}
        />
        <FieldRow
          label="LinkedIn"
          icon={<Linkedin className="w-3 h-3" />}
          editing={editing}
          value={local.personalInfo.linkedin ?? ""}
          onChange={(v) => updatePersonal("linkedin", v)}
        />
        <FieldRow
          label="GitHub"
          icon={<Github className="w-3 h-3" />}
          editing={editing}
          value={local.personalInfo.github ?? ""}
          onChange={(v) => updatePersonal("github", v)}
        />
        <FieldRow
          label="Website"
          icon={<Globe className="w-3 h-3" />}
          editing={editing}
          value={local.personalInfo.website ?? ""}
          onChange={(v) => updatePersonal("website", v)}
        />
        <FieldRow
          label="Summary"
          editing={editing}
          value={local.personalInfo.summary ?? ""}
          onChange={(v) => updatePersonal("summary", v)}
          multiline
        />
      </Section>

      {/* Skills */}
      <Section title="Skills" icon={<Code className="w-3.5 h-3.5" />}>
        {editing ? (
          <div className="mt-2.5">
            <label className="text-xs text-muted-foreground mb-1 block">
              Skills (comma-separated)
            </label>
            <Textarea
              value={local.skills.join(", ")}
              onChange={(e) => updateSkills(e.target.value)}
              className="text-xs"
              placeholder="React, TypeScript, Python..."
            />
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {local.skills.length > 0 ? (
              local.skills.slice(0, 20).map((skill) => (
                <Badge key={skill} variant="red" className="text-xs">
                  {skill}
                </Badge>
              ))
            ) : (
              <p className="text-xs text-muted-foreground/50 italic">No skills listed</p>
            )}
            {local.skills.length > 20 && (
              <Badge variant="secondary">+{local.skills.length - 20} more</Badge>
            )}
          </div>
        )}
      </Section>

      {/* Experience */}
      <Section title="Experience" icon={<Briefcase className="w-3.5 h-3.5" />}>
        {local.experience.length > 0 ? (
          local.experience.map((exp, i) => (
            <div key={i} className="mt-2.5 first:mt-2">
              {i > 0 && <Separator className="mb-2" />}
              <p className="text-xs font-semibold text-foreground">{exp.title}</p>
              <p className="text-xs text-primary">{exp.company}</p>
              <p className="text-xs text-muted-foreground">
                {exp.startDate} – {exp.current ? "Present" : exp.endDate}
              </p>
              {exp.description && (
                <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-3">
                  {exp.description}
                </p>
              )}
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground/50 italic mt-2.5">No experience listed</p>
        )}
      </Section>

      {/* Education */}
      <Section title="Education" icon={<GraduationCap className="w-3.5 h-3.5" />}>
        {local.education.length > 0 ? (
          local.education.map((edu, i) => (
            <div key={i} className="mt-2.5 first:mt-2">
              {i > 0 && <Separator className="mb-2" />}
              <p className="text-xs font-semibold text-foreground">{edu.institution}</p>
              <p className="text-xs text-primary">
                {edu.degree}{edu.field ? ` · ${edu.field}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {edu.startDate} – {edu.endDate}
                {edu.gpa ? ` · GPA: ${edu.gpa}` : ""}
              </p>
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground/50 italic mt-2.5">No education listed</p>
        )}
      </Section>

      {/* Certifications */}
      {local.certifications.length > 0 && (
        <Section title="Certifications" icon={<Award className="w-3.5 h-3.5" />}>
          {local.certifications.map((cert, i) => (
            <div key={i} className="mt-2.5 first:mt-2">
              <p className="text-xs font-medium text-foreground">{cert.name}</p>
              {cert.issuer && (
                <p className="text-xs text-muted-foreground">{cert.issuer}</p>
              )}
            </div>
          ))}
        </Section>
      )}
    </div>
  );
};
