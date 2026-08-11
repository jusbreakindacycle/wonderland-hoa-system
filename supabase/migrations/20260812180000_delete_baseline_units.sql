-- Delete the two baseline units (117 and 121) to achieve completely clean schema
DELETE FROM units WHERE house_no IN ('117', '121');