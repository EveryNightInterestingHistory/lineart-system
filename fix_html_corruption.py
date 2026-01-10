
import os

file_path = 'e:/ИИ/NP/index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 1. Keep lines 1-171 (indices 0-171)
# Line 171 is index 170.
# We want up to index 170 inclusive.
part1 = lines[:171]

# 2. Add closing tags for employees-view
part2 = [
    '                </div>\n',
    '                <div id="employees-list" class="compact-grid">\n',
    '                    <!-- Populated by JS -->\n',
    '                </div>\n',
    '            </div>\n'
]

# 3. Extract project-details-view
# Starts at line 355 (index 354)
# Ends at line 546 (index 545)
# We want indices 354 to 546 (inclusive of 545, exclusive of 546 in slice)
# Wait, line 546 is `</div>` closing project-details-view.
# So slice 354:546
part3 = lines[354:546]

# 4. Add closing main and Modals comment
part4 = [
    '        </main>\n\n',
    '        <!-- Modals -->\n'
]

# 5. Extract Modals
# Starts at line 550 (index 549)
# Ends at line 803 (index 802)
# Slice 549:803
part5 = lines[549:803]

# 6. Extract Toast and Script
# Starts at line 805 (index 804)
# Ends at line 806 (index 805)
# Slice 804:806
part6 = lines[804:806]

# 7. Add closing body and html
part7 = [
    '    </body>\n',
    '</html>'
]

new_content = part1 + part2 + part3 + part4 + part5 + part6 + part7

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_content)

print("Successfully fixed index.html")
