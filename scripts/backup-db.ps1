param(
  [string]$DatabaseName = "fire_extinguisher_db",
  [string]$User = "postgres",
  [string]$Output = "database-backup.sql"
)

pg_dump -U $User -d $DatabaseName -f $Output
